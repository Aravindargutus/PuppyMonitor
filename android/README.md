# Bonzaa — Android app

Puppy food tracker backed by Zoho Catalyst (IN DC). Tracks every meal from
morning to night per puppy, and when a symptom is logged it analyzes the
2–48 hour window before onset to rank suspect foods.

## Stack

- Kotlin + Jetpack Compose (Material 3), single-activity
- Retrofit + kotlinx-serialization against the deployed Catalyst Advanced I/O
  function: `https://bonzaa-60031184881.development.catalystserverless.in/server/bonzaa_api/`
- minSdk 26, targetSdk 35

## Run it

1. Install [Android Studio](https://developer.android.com/studio) (Ladybug or newer).
2. Open this `android/` folder — Studio downloads Gradle 8.11.1 and the SDK
   automatically on first sync.
3. Run the `app` configuration on an emulator or device (API 26+).

## Notes

- The backend returns numerics as strings in insert responses but numbers in
  query responses; `FlexibleDouble`/`FlexibleBoolean` serializers in
  `data/Models.kt` absorb both.
- Datetimes are plain `yyyy-MM-dd HH:mm:ss` strings in the Catalyst project
  timezone end to end — no UTC conversion anywhere.
- Tabs: **Today** (per-puppy day timeline, morning→night), **Foods** (catalog),
  **Insights** (symptom incidents + suspect analysis sheet), **Puppies**.
