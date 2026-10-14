# Use with minifyEnabled=true and Android's proguard-android-optimize.txt in release.
# R8 increases reverse-engineering cost; it does not make WebView JavaScript secret.
-keepattributes RuntimeVisibleAnnotations,RuntimeInvisibleAnnotations,AnnotationDefault,Signature,InnerClasses,EnclosingMethod

# Capacitor loads plugins through annotations/reflection and the JavaScript bridge.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod <methods>;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
# The sole native diagnostic bridge exposes public status JSON and no actions.
-keep class vn.hongioi.sinhton.MainActivity$NativeSecurityBridge {
    @android.webkit.JavascriptInterface public java.lang.String status();
}

# Entry used from MainActivity; nested report is also available to Java callers.
-keep class vn.hongioi.sinhton.SecurityGuard { public *; }
-keep class vn.hongioi.sinhton.SecurityGuard$* { *; }

# Keep Android WebView callback overrides while allowing other app code to shrink.
-keepclassmembers class * extends android.webkit.WebViewClient {
    public boolean shouldOverrideUrlLoading(...);
    public android.webkit.WebResourceResponse shouldInterceptRequest(...);
}
