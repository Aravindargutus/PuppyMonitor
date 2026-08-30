package com.bonzaa.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.bonzaa.app.data.ApiClient
import com.bonzaa.app.ui.Lang
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.concurrent.TimeUnit

/**
 * Daily feeding reminders: one periodic worker per meal slot, firing at the
 * slot's time. The worker checks the backend first and stays silent when every
 * puppy already has a meal logged for that slot today.
 */
object Reminders {

    const val CHANNEL_ID = "bonzaa_reminders"

    // slot key -> reminder time (matches MealSlots defaults)
    val slotTimes = mapOf(
        "morning" to LocalTime.of(8, 0),
        "noon" to LocalTime.of(12, 30),
        "evening" to LocalTime.of(17, 30),
        "night" to LocalTime.of(21, 0),
    )

    fun ensureChannel(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "Feeding reminders",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply { description = "Reminds you to feed and log each meal" }
        )
    }

    fun scheduleAll(context: Context) {
        val wm = WorkManager.getInstance(context)
        val now = LocalDateTime.now()
        slotTimes.forEach { (slot, time) ->
            var next = LocalDateTime.of(LocalDate.now(), time)
            if (!next.isAfter(now)) next = next.plusDays(1)
            val delay = Duration.between(now, next)
            val request = PeriodicWorkRequestBuilder<ReminderWorker>(24, TimeUnit.HOURS)
                .setInitialDelay(delay.toMinutes(), TimeUnit.MINUTES)
                .setInputData(workDataOf("slot" to slot))
                .build()
            wm.enqueueUniquePeriodicWork("reminder_$slot", ExistingPeriodicWorkPolicy.KEEP, request)
        }
    }
}

class ReminderWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val slot = inputData.getString("slot") ?: return Result.success()
        val context = applicationContext

        if (context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) return Result.success()

        // Skip the notification when every puppy already has this slot logged today.
        val allFed = try {
            val today = LocalDate.now().toString()
            val puppies = ApiClient.api.getPuppies().puppies
            puppies.isNotEmpty() && puppies.all { p ->
                ApiClient.api.getFeedings(p.id, today).feedings.any { it.mealSlot == slot }
            }
        } catch (e: Exception) {
            false // network trouble → remind anyway, better safe than a hungry puppy
        }
        if (allFed) return Result.success()

        val langCode = context.getSharedPreferences("bonzaa", 0).getString("lang", "en") ?: "en"
        val lang = Lang(langCode)
        Reminders.ensureChannel(context)

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pending = PendingIntent.getActivity(
            context, slot.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, Reminders.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_paw)
            .setContentTitle(lang["notif_title"])
            .setContentText(lang.fmt("notif_body", lang[slot]))
            .setAutoCancel(true)
            .setContentIntent(pending)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        context.getSystemService(NotificationManager::class.java)
            .notify(slot.hashCode(), notification)
        return Result.success()
    }
}
