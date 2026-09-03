package com.bonzaa.app.data

import android.app.Activity
import android.content.Context
import android.content.pm.ApplicationInfo
import android.util.Log
import com.zoho.catalyst.setup.ZCatalystApp
import com.zoho.catalyst.setup.ZCatalystSDKConfigs
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Thin wrapper over the Catalyst Android SDK.
 *
 * The SDK reads its configuration (client id/secret, project, redirect url)
 * from app/src/main/assets/app_configuration_development.properties — that file
 * is gitignored because it carries the OAuth client secret, so a fresh clone
 * must download it from Console → Mobile SDK before the app can sign in.
 */
object CatalystAuth {

    private const val TAG = "BonzaaAuth"

    /**
     * Which app_configuration_<env>.properties the SDK loads. init() without an
     * environment defaults to PRODUCTION and fails with FileNotFoundException
     * when only the development file is bundled.
     */
    private val ENVIRONMENT = ZCatalystSDKConfigs.Environment.DEVELOPMENT

    @Volatile private var initialized = false

    fun init(context: Context) {
        if (initialized) return
        runCatching {
                ZCatalystApp.init(context.applicationContext, ENVIRONMENT)
                // The IAM SDK's own logging is the only way to see why a login
                // failed (every server error reaches us as "general_error"), but
                // it prints the OAuth client_secret in request URLs — so enable
                // it on debug builds only, never in the APK we hand out.
                if (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) {
                    runCatching {
                        Class.forName("com.zoho.accounts.externalportal.IAMClientSDK")
                            .getMethod("showLogs").invoke(null)
                    }
                }
            }
            .onSuccess { initialized = true }
            .onFailure { Log.e(TAG, "Catalyst SDK init failed", it) }
    }

    fun isSignedIn(): Boolean =
        initialized && runCatching { ZCatalystApp.getInstance().isUserSignedIn() }.getOrDefault(false)

    /**
     * Opens Zoho's hosted sign-in screen in a Chrome Custom Tab — the same page
     * the web app uses, so it offers Google plus email/password and needs no
     * per-app Google client.
     *
     * The other overload, login(activity, googleClientID, ...), does a *native*
     * Google sign-in and posts the resulting Google id_token to
     * /oauth/v2/native/token. Google issues that token fine, but Zoho answers
     * {"error":"general_error"} — it will only trust an id_token whose audience
     * is a Google client registered on its side, which the console gives no way
     * to supply. Do not go back to it without fixing that first.
     */
    fun login(activity: Activity, onDone: (Boolean, String?) -> Unit) {
        if (!initialized) return onDone(false, "Catalyst SDK not initialised")
        ZCatalystApp.getInstance().login(
            HashMap(),
            {
                Log.i(TAG, "login success")
                onDone(true, null)
            },
            { e ->
                Log.e(TAG, "login FAILED code=${e.code} msg=${e.message}", e)
                onDone(false, e.message)
            },
        )
    }

    fun logout(onDone: (Boolean, String?) -> Unit) {
        if (!initialized) return onDone(false, null)
        ZCatalystApp.getInstance().logout(
            { onDone(true, null) },
            { e -> onDone(false, e.message) },
        )
    }

    /**
     * Blocking token fetch for the OkHttp interceptor. getAccessToken is
     * callback-based, but interceptors are synchronous, so wait on a latch.
     * Never call from the main thread — OkHttp interceptors run off it.
     */
    fun blockingAccessToken(timeoutMs: Long = 10_000): String? {
        if (!isSignedIn()) return null
        val latch = CountDownLatch(1)
        var token: String? = null
        runCatching {
            ZCatalystApp.getInstance().getAccessToken(
                { t -> token = t; latch.countDown() },
                { e -> Log.w(TAG, "getAccessToken failed: ${e.message}"); latch.countDown() },
            )
        }.onFailure { latch.countDown() }
        latch.await(timeoutMs, TimeUnit.MILLISECONDS)
        return token
    }
}
