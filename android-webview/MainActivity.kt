package vn.hongioi.sinhton

import android.app.Activity
import android.content.Context
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebResourceRequest
import android.webkit.JavascriptInterface
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader

class MainActivity : Activity() {
    private lateinit var game: WebView
    private var hasResumed = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        SecurityGuard.enforce(this, allowDebug = BuildConfig.DEBUG)
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        game = WebView(this)
        game.addJavascriptInterface(NativeSecurityBridge(this), "HongioiNativeSecurity")
        game.filterTouchesWhenObscured = true
        game.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
            setRenderPriority(android.webkit.WebSettings.RenderPriority.HIGH)
            allowFileAccess = false
            allowContentAccess = false
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }
        game.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url)
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                request.url.host != "appassets.androidplatform.net"
        }
        game.setBackgroundColor(android.graphics.Color.rgb(16,43,50))
        game.setLayerType(View.LAYER_TYPE_HARDWARE, null)
        setContentView(game)
        game.loadUrl("https://appassets.androidplatform.net/assets/startup.html")
        immersive()
    }

    private class NativeSecurityBridge(context: Context) {
        private val applicationContext = context.applicationContext

        @JavascriptInterface
        fun status(): String = SecurityGuard.statusJson(applicationContext)
    }

    @Suppress("DEPRECATION")
    private fun immersive() {
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
            View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) immersive()
    }
    override fun onPause() { if (::game.isInitialized) { game.evaluateJavascript("window.dispatchEvent(new Event('hon-gioi-native-pause'))", null); game.onPause() }; super.onPause() }
    override fun onResume() { super.onResume(); if (::game.isInitialized) { game.onResume(); if (hasResumed) game.evaluateJavascript("window.dispatchEvent(new Event('hon-gioi-native-resume'))", null) }; hasResumed = true }
    override fun onDestroy() { game.destroy(); super.onDestroy() }
}
