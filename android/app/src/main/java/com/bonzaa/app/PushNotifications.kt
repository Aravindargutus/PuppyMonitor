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

    private fun registerToken(token: String?) {
        if (token.isNullOrBlank()) return
        // true, matching Catalyst's own documented registration call — this flag is
        // unrelated to our Catalyst Development/Production environment; it went
        // untested at false and no push arrived, so follow the documented example.
        ZCatalystApp.getInstance().registerNotification(
            token, BUNDLE_ID, CATALYST_APP_ID, true,
            { Log.i(TAG, "Device registered for push") },
            { e ->
                // Catalyst rejects re-registering an already-registered (token, appId,
                // isProduction) triple instead of treating it as a no-op — expected on
                // every app launch after the first, so it isn't a real failure.
                if (e.message?.contains("already registered", ignoreCase = true) == true) {
                    Log.i(TAG, "Device already registered for push")
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
            Log.i(TAG, "onMessageReceived notification=${message.notification?.body} data=${message.data}")
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
                .build()

            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) return
            getSystemService(NotificationManager::class.java)
                .notify(System.currentTimeMillis().toInt(), notification)
        }
    }
}
