package vn.hongioi.sinhton

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Debug
import java.io.File
import java.security.MessageDigest
import org.json.JSONArray
import org.json.JSONObject

/** Native signals supplement server authority; they cannot guarantee detection of
 * a modified OS, hidden Frida, a rooted device, or a repackaged APK on that OS. */
object SecurityGuard {
    private const val PIN_METADATA = "vn.hongioi.sinhton.TRUSTED_SIGNING_SHA256"

    data class Report(
        val debugBuild: Boolean,
        val pinConfigured: Boolean,
        val signatureTrusted: Boolean,
        val signingSha256: Set<String>,
        val rootSignals: List<String>,
        val instrumentationSignals: List<String>
    ) {
        val suspiciousRuntime: Boolean
            get() = rootSignals.isNotEmpty() || instrumentationSignals.isNotEmpty()
    }

    private fun normalizePin(value: String): String =
        value.replace(":", "").replace(" ", "").uppercase()

    private fun configuredPins(context: Context): Set<String> {
        @Suppress("DEPRECATION")
        val application = context.packageManager.getApplicationInfo(
            context.packageName, PackageManager.GET_META_DATA
        )
        val metadataValue = application.metaData?.get(PIN_METADATA)
        val resourceId = context.resources.getIdentifier("hg_signing_sha256", "string", context.packageName)
        val text = when (metadataValue) {
            is String -> metadataValue
            is Int -> runCatching { context.getString(metadataValue) }.getOrDefault("")
            else -> if (resourceId != 0) context.getString(resourceId) else ""
        }
        return text.split(',', ';', '\n').map(::normalizePin)
            .filter { it.matches(Regex("[0-9A-F]{64}")) }.toSet()
    }

    @Suppress("DEPRECATION")
    private fun signingDigests(context: Context): Set<String> {
        val manager = context.packageManager
        val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            manager.getPackageInfo(context.packageName, PackageManager.GET_SIGNING_CERTIFICATES)
                .signingInfo?.apkContentsSigners.orEmpty()
        } else {
            manager.getPackageInfo(context.packageName, PackageManager.GET_SIGNATURES)
                .signatures.orEmpty()
        }
        return signatures.map { signature ->
            MessageDigest.getInstance("SHA-256").digest(signature.toByteArray())
                .joinToString("") { byte -> "%02X".format(byte.toInt() and 0xff) }
        }.toSet()
    }

    @JvmStatic
    @JvmOverloads
    fun inspect(context: Context, expectedSha256: Set<String> = configuredPins(context)): Report {
        val pins = expectedSha256.map(::normalizePin)
            .filter { it.matches(Regex("[0-9A-F]{64}")) }.toSet()
        val installed = signingDigests(context)
        val roots = mutableListOf<String>()
        val instrumentation = mutableListOf<String>()
        val paths = listOf(
            "/system/bin/su", "/system/xbin/su", "/sbin/su",
            "/system/app/Superuser.apk", "/sbin/.magisk", "/debug_ramdisk/magisk"
        )
        if (paths.any { File(it).exists() }) roots += "known-root-artifact"
        if (Build.TAGS?.contains("test-keys") == true) roots += "test-key-os-build"
        if (Debug.isDebuggerConnected() || Debug.waitingForDebugger())
            instrumentation += "debugger-attached"
        val maps = runCatching { File("/proc/self/maps").readText() }.getOrDefault("")
        if (Regex("frida|libgadget|substrate|xposed", RegexOption.IGNORE_CASE).containsMatchIn(maps))
            instrumentation += "known-instrumentation-library"
        if (runCatching { Class.forName("de.robv.android.xposed.XposedBridge") }.isSuccess)
            instrumentation += "xposed-class"
        return Report(
            debugBuild = context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0,
            pinConfigured = pins.isNotEmpty(),
            signatureTrusted = installed.isNotEmpty() && pins.isNotEmpty() && installed.all { it in pins },
            signingSha256 = installed,
            rootSignals = roots,
            instrumentationSignals = instrumentation
        )
    }

    /** Public, read-only diagnostics for the local WebView. Certificate digests
     * are public APK information; no signing secret, file path or command API is
     * exposed. These signals are not hardware-backed integrity attestation. */
    @JvmStatic
    fun statusJson(context: Context): String {
        return try {
            val report = inspect(context)
            JSONObject()
                .put("available", true)
                .put("checked", true)
                .put("source", "android-native")
                .put("debugBuild", report.debugBuild)
                .put("pinConfigured", report.pinConfigured)
                .put("signatureTrusted", report.signatureTrusted)
                .put("signingSha256", JSONArray(report.signingSha256.toList()))
                .put("rootSignals", JSONArray(report.rootSignals))
                .put("instrumentationSignals", JSONArray(report.instrumentationSignals))
                .put("suspiciousRuntime", report.suspiciousRuntime)
                .put("hardwareAttested", false)
                .put("scope", "APK certificate pin and heuristic runtime signals; not proof of an unmodified device")
                .toString()
        } catch (error: Exception) {
            JSONObject()
                .put("available", true)
                .put("checked", false)
                .put("source", "android-native")
                .put("signatureTrusted", false)
                .put("hardwareAttested", false)
                .put("error", "native-inspection-unavailable")
                .toString()
        }
    }

    /** Configure certificate SHA-256 pins in manifest metadata before release.
     * Missing/mismatching pins fail closed in release. Debug stays usable without
     * production certificates. Runtime heuristics may be disabled for supported
     * rooted-device deployments; signature verification remains mandatory. */
    @JvmStatic
    @JvmOverloads
    fun enforce(context: Context, allowDebug: Boolean = false, blockSuspiciousRuntime: Boolean = false): Report {
        val report = inspect(context)
        if (report.debugBuild && allowDebug) return report
        check(report.pinConfigured) { "Chưa cấu hình SHA-256 của chứng thư ký bản phát hành" }
        check(report.signatureTrusted) { "Chữ ký APK không khớp bản phát hành tin cậy" }
        check(!blockSuspiciousRuntime || !report.suspiciousRuntime) {
            "Phát hiện tín hiệu can thiệp vào môi trường chạy"
        }
        return report
    }
}
