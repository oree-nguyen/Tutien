import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
const path = "android/app/src/main";
let manifest = await readFile(`${path}/AndroidManifest.xml`, "utf8");
if (!manifest.includes("android:screenOrientation="))
  manifest = manifest.replace(
    'android:name=".MainActivity"',
    'android:name=".MainActivity"\n            android:screenOrientation="sensorLandscape"',
  );
manifest = manifest.replace(
  'android:allowBackup="true"',
  'android:allowBackup="false"',
);
if (!manifest.includes("vn.hongioi.sinhton.TRUSTED_SIGNING_SHA256"))
  manifest = manifest.replace(
    "</application>",
    `    <meta-data android:name="vn.hongioi.sinhton.TRUSTED_SIGNING_SHA256" android:resource="@string/hg_signing_sha256" />\n    </application>`,
  );
await writeFile(`${path}/AndroidManifest.xml`, manifest);
await mkdir(`${path}/java/vn/hongioi/sinhton`, { recursive: true });
await copyFile(
  "android-webview/SecurityGuard.kt",
  `${path}/java/vn/hongioi/sinhton/SecurityGuard.kt`,
);
await copyFile(
  "android-webview/proguard-rules.pro",
  "android/app/proguard-rules.pro",
);
let pinText = process.env.HG_TRUSTED_SIGNING_SHA256;
const pinResource = `${path}/res/values/security-pins.xml`;
if (pinText === undefined) {
  try {
    pinText =
      (await readFile(pinResource, "utf8")).match(
        /<string[^>]*>([^<]*)<\/string>/,
      )?.[1] ?? "";
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    pinText = "";
  }
}
const pins = pinText
  .split(/[,;\n]/)
  .map((pin) => pin.replace(/[:\s]/g, "").toUpperCase())
  .filter(Boolean);
if (pins.some((pin) => !/^[A-F0-9]{64}$/.test(pin)))
  throw Error(
    "HG_TRUSTED_SIGNING_SHA256 phải chứa SHA-256 chứng thư ký APK (64 ký tự hex/mã)",
  );
await mkdir(`${path}/res/values`, { recursive: true });
await writeFile(
  pinResource,
  `<?xml version="1.0" encoding="utf-8"?>\n<resources><string name="hg_signing_sha256" translatable="false">${[...new Set(pins)].join(",")}</string></resources>\n`,
);
await writeFile(
  `${path}/java/vn/hongioi/sinhton/MainActivity.java`,
  `package vn.hongioi.sinhton;
import android.content.pm.ActivityInfo;
import android.content.Context;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle state) {
    // Compile-time DEBUG is intentional: changing only the manifest's debug flag
    // must not turn off release certificate verification.
    SecurityGuard.enforce(this, BuildConfig.DEBUG, false);
    super.onCreate(state);
    getBridge().getWebView().addJavascriptInterface(new NativeSecurityBridge(this), "HongioiNativeSecurity");
    setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
    getBridge().getWebView().getSettings().setJavaScriptEnabled(true);
    getBridge().getWebView().getSettings().setDomStorageEnabled(true);
    getBridge().getWebView().setFilterTouchesWhenObscured(true);
    getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    immersive();
  }
  public static final class NativeSecurityBridge {
    private final Context context;
    public NativeSecurityBridge(Context context) { this.context = context.getApplicationContext(); }
    @JavascriptInterface public String status() { return SecurityGuard.statusJson(context); }
  }
  @SuppressWarnings("deprecation") private void immersive() {
    getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
      View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
      View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
      View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
  }
  @Override public void onWindowFocusChanged(boolean focus) { super.onWindowFocusChanged(focus); if(focus) immersive(); }
}
`,
);
let appGradle = await readFile("android/app/build.gradle", "utf8");
appGradle = appGradle.replace(/minifyEnabled\s+false/, "minifyEnabled true");
appGradle = appGradle.replace(
  "proguard-android.txt",
  "proguard-android-optimize.txt",
);
if (!appGradle.includes("shrinkResources true"))
  appGradle = appGradle.replace(
    /release\s*{/,
    "release {\n            shrinkResources true",
  );
if (!appGradle.includes("apply from: 'security.build.gradle'"))
  appGradle += "\napply from: 'security.build.gradle'\n";
await writeFile("android/app/build.gradle", appGradle);
// Gradle 8.11.1 already ships the pinned Kotlin 2.0.20 compiler and stdlib. Compile
// the native guard with that local toolchain: no unpinned Gradle plugin download.
await writeFile(
  "android/app/security.build.gradle",
  `
def hgKotlinVersion = '2.0.20'
def hgKotlinLib = new File(gradle.gradleHomeDir, 'lib')
def hgKotlinStdlib = new File(hgKotlinLib, "kotlin-stdlib-\${hgKotlinVersion}.jar")
def hgKotlinCompiler = new File(hgKotlinLib, "kotlin-compiler-embeddable-\${hgKotlinVersion}.jar")
def hgKotlinAnnotations = new File(hgKotlinLib, 'annotations-24.0.1.jar')
if (!hgKotlinCompiler.isFile() || !hgKotlinStdlib.isFile() || !hgKotlinAnnotations.isFile()) {
    throw new GradleException('The pinned Gradle 8.11.1 / Kotlin 2.0.20 local compiler is required.')
}
android { buildFeatures { buildConfig true } }
configurations.configureEach {
    exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib'
    exclude group: 'org.jetbrains', module: 'annotations'
}
dependencies { implementation files(hgKotlinStdlib, hgKotlinAnnotations) }
android.applicationVariants.all { variant ->
    def output = layout.buildDirectory.dir("generated/securityKotlin/\${variant.name}")
    def source = file('src/main/java/vn/hongioi/sinhton/SecurityGuard.kt')
    def compileGuard = tasks.register("compile\${variant.name.capitalize()}SecurityKotlin", JavaExec) {
        inputs.file(source)
        outputs.dir(output)
        classpath = files(fileTree(hgKotlinLib) { include '*.jar' })
        mainClass.set('org.jetbrains.kotlin.cli.jvm.K2JVMCompiler')
        args '-no-stdlib', '-no-reflect', '-jvm-target', '17',
             '-classpath', (android.bootClasspath + [hgKotlinStdlib]).join(File.pathSeparator),
             '-d', output.get().asFile.absolutePath, source.absolutePath
    }
    variant.javaCompileProvider.configure {
        dependsOn compileGuard
        classpath += files(output)
    }
    variant.registerPostJavacGeneratedBytecode(files(output).builtBy(compileGuard))
}
`,
);
console.log(
  `Configured landscape WebView, obscured-touch filter, native Kotlin guard, release R8 and ${pins.length} certificate pin(s). Debug is usable; release requires a matching trusted signing certificate.`,
);
