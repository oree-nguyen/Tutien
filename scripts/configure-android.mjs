import { readFile, writeFile, mkdir } from "node:fs/promises";
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
await writeFile(`${path}/AndroidManifest.xml`, manifest);
await mkdir(`${path}/java/vn/hongioi/sinhton`, { recursive: true });
await writeFile(
  `${path}/java/vn/hongioi/sinhton/MainActivity.java`,
  `package vn.hongioi.sinhton;
import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
    getBridge().getWebView().getSettings().setJavaScriptEnabled(true);
    getBridge().getWebView().getSettings().setDomStorageEnabled(true);
    getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    immersive();
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
console.log(
  "Configured sensorLandscape, WebGL WebView and immersive fullscreen.",
);
