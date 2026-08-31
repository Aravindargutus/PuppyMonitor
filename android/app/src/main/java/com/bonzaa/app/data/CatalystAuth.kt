package com.bonzaa.app.data

import android.app.Activity
import android.content.Context
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

    /** Matches `redirectUrl` in the properties file / the console package. */
    const val REDIRECT_URL = "bonzaa"

    /**
     * Which app_configuration_<env>.properties the SDK loads. init() without an
     * environment defaults to PRODUCTION and fails with FileNotFoundException
     * when only the development file is bundled.
     */
    private val ENVIRONMENT = ZCatalystSDKConfigs.Environment.DEVELOPMENT

    @Volatile private var initialized = false

    fun init(context: Context) {
        if (initialized) return
        runCatching { ZCatalystApp.init(context.applicationContext, ENVIRONMENT) }
            .onSuccess { initialized = true }
            .onFailure { Log.e(TAG, "Catalyst SDK init failed", it) }
    }

    fun isSignedIn(): Boolean =
        initialized && runCatching { ZCatalystApp.getInstance().isUserSignedIn() }.getOrDefault(false)

    fun login(activity: Activity, onDone: (Boolean, String?) -> Unit) {
        if (!initialized) return onDone(false, "Catalyst SDK not initialised")
        ZCatalystApp.getInstance().login(
            activity,
            REDIRECT_URL,
            { onDone(true, null) },
            { e -> onDone(false, e.message) },
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
