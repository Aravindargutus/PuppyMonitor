package com.bonzaa.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.bonzaa.app.data.CatalystAuth
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.zoho.catalyst.setup.ZCatalystApp

/**
 * Family activity push: when someone logs a symptom, every other member of
 * the household gets notified on their phone, even with the app closed.
 * Delivery itself is Firebase Cloud Messaging — Catalyst's Push Notification
 * service is a managed wrapper around it (Console > Notify > Push
 * Notifications > Android), which is why this app also needs its own
 * Firebase project and google-services.json, gitignored per-developer like
 * the Catalyst mobile config.
 */
object PushNotifications {

    private const val TAG = "BonzaaPush"
    const val CHANNEL_ID = "bonzaa_activity"

    // "Android Configuration" ID from Console > Notify > Push Notifications > Android —
    // this is the appID registerNotification() and the backend's pushNotification().mobile()
    // both key off, not a Firebase project ID.
    private const val CATALYST_APP_ID = "5433000043323270"
    private const val BUNDLE_ID = "com.bonzaa.app"
    private const val DEREGISTER_MAX_ATTEMPTS = 3
    private const val DEREGISTER_RETRY_DELAY_MS = 800L

    fun ensureChannel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "Family activity",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply { description = "Notifies you when someone in your family logs a meal or a symptom" }
        )
    }

    /** Call once per app session, right after sign-in succeeds. */
    fun registerDevice() {
        if (!CatalystAuth.isSignedIn()) return
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.w(TAG, "FCM token fetch failed", task.exception)
                return@addOnCompleteListener
            }
            registerToken(task.result)
        }
    }

    /**
     * Call before signing out. Without this the device stays registered against
     * the account that's leaving — on a shared or handed-down phone the next
     * person to sign in could otherwise still receive the previous account's
     * family notifications until the token happens to rotate on its own.
     *
     * This is the ONLY place this can ever be attempted: deregisterNotification()
     * reaches into the currently signed-in user internally to fetch an access
     * token (confirmed in the SDK's own bytecode — the exact same call path that
     * NPEs in registerNotification() when nobody's signed in), so once
     * CatalystAuth.logout() actually completes there is no session left to
     * authenticate a retry with. There's no "try again later while signed out" —
     * retrying can only mean retrying now, before logout, which is what the
     * bounded retries below are for.
     *
     * If all retries fail, this calls onFailure instead of silently calling
     * onSuccess: proceeding with sign-out anyway would leave the device
     * receiving family push for however long it takes registerToken()'s
     * "already registered" self-heal to notice at some future sign-in — a
     * silent, unbounded window. The caller decides what to do with that
     * (typically: ask the person whether to sign out anyway), rather than the
     * SDK deciding it on their behalf.
     */
    fun deregisterDevice(onSuccess: () -> Unit, onFailure: () -> Unit) {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            val token = task.result
            if (!task.isSuccessful || token.isNullOrBlank()) return@addOnCompleteListener onSuccess()
            attemptDeregister(token, attempt = 1, onSuccess, onFailure)
        }
    }

    private fun attemptDeregister(token: String, attempt: Int, onSuccess: () -> Unit, onFailure: () -> Unit) {
        ZCatalystApp.getInstance().deregisterNotification(
            token, BUNDLE_ID, CATALYST_APP_ID, true,
            { Log.i(TAG, "Device deregistered from push (attempt $attempt)"); onSuccess() },
            { e ->
                Log.w(TAG, "deregisterNotification failed (attempt $attempt): ${e.message}")
                if (attempt < DEREGISTER_MAX_ATTEMPTS) {
                    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(
                        { attemptDeregister(token, attempt + 1, onSuccess, onFailure) },
                        DEREGISTER_RETRY_DELAY_MS,
                    )
                } else {
                    Log.w(TAG, "Giving up on deregister after $attempt attempts")
                    onFailure()
                }
            },
        )
    }

    private fun registerToken(token: String?, isRetry: Boolean = false) {
        // onNewToken() fires the moment FCM issues a token — on a fresh install
        // that's before sign-in ever happens. registerNotification() reaches into
        // the signed-in user internally and NPEs if there isn't one, so this guard
        // has to live here, not just in registerDevice()'s caller.
        if (token.isNullOrBlank() || !CatalystAuth.isSignedIn()) return
        // true, matching Catalyst's own documented registration call — this flag is
        // unrelated to our Catalyst Development/Production environment; it went
        // untested at false and no push arrived, so follow the documented example.
        ZCatalystApp.getInstance().registerNotification(
            token, BUNDLE_ID, CATALYST_APP_ID, true,
            { Log.i(TAG, "Device registered for push") },
            { e ->
                if (!isRetry && e.message?.contains("already registered", ignoreCase = true) == true) {
                    // This token is already registered — could be this same account (the
                    // common case, harmless), or it could be a DIFFERENT account's leftover
                    // registration from a sign-out whose deregisterDevice() call failed (a
                    // shared/handed-down phone, say). Deregistering solely on "already
                    // registered" and trusting logout alone isn't enough — logout is
                    // intentionally best-effort so a push API hiccup never blocks signing
                    // out, so this is where that gap actually gets closed: whoever is
                    // signed in now forces the token to point at them, every time they sign
                    // in, regardless of what happened at whatever the last sign-out was.
                    Log.i(TAG, "Already registered — clearing and re-registering for the current account")
                    ZCatalystApp.getInstance().deregisterNotification(
                        token, BUNDLE_ID, CATALYST_APP_ID, true,
                        { registerToken(token, isRetry = true) },
                        { de -> Log.w(TAG, "Could not clear stale registration: ${de.message}") },
                    )
                } else if (isRetry) {
                    Log.w(TAG, "registerNotification retry failed: ${e.message}")
                } else {
                    Log.w(TAG, "registerNotification failed: ${e.message}")
                }
            },
        )
    }

    /** Refreshed tokens (rotation, app reinstall, cleared data) need re-registering too. */
    class TokenService : FirebaseMessagingService() {
        override fun onNewToken(token: String) {
            registerToken(token)
        }

        override fun onMessageReceived(message: RemoteMessage) {
            // The payload carries a family member's name and a symptom/severity —
            // fine to show on-device, not fine to leave sitting in release logcat.
            if (BuildConfig.DEBUG) {
                Log.i(TAG, "onMessageReceived notification=${message.notification?.body} data=${message.data}")
            }
            // sendAndroidNotification's payload arrives as a data message, not a
            // system-rendered "notification" one, so we build and show it ourselves —
            // this is also what lets the app stay silent while it's already open on
            // the relevant puppy instead of double-notifying. Confirmed live: Catalyst
            // puts the text in "msg" (data.message / data.body were both guesses and
            // both wrong), alongside "uid", "type"="CNS", "badge", "sound".
            val body = message.notification?.body
                ?: message.data["msg"]
                ?: message.data["message"]
                ?: message.data["body"]
                ?: return
            val title = message.notification?.title ?: message.data["title"] ?: "🐾 Bonzaa"

            ensureChannel(this)
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pending = PendingIntent.getActivity(
                this, System.currentTimeMillis().toInt(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_paw)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setContentIntent(pending)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                // Symptom/member details shouldn't sit readable on a locked phone's screen.
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
                .build()

            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) return
            getSystemService(NotificationManager::class.java)
                .notify(System.currentTimeMillis().toInt(), notification)
        }
    }
}
