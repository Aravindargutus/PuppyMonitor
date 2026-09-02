# Bonzaa 🐾

A puppy-feeding tracker (web + Android) on Zoho Catalyst. Logs every meal from
morning to night per puppy, and when a symptom is logged it analyses the
2–48 hour window before onset to rank the foods that most likely caused it.
Fully bilingual (English / தமிழ்) with voice input and feeding reminders.

- **Web app:** https://bonzaa-60031184881.development.catalystserverless.in/app/index.html
- **Data center:** Zoho Catalyst, IN

---

## Repo layout

| Path | What it is |
|------|------------|
| `functions/bonzaa_api/` | Catalyst Advanced I/O function — the REST API + suspect-food scoring |
| `client/` | Web client (vanilla JS SPA), served from Catalyst client hosting at `/app` |
| `android/` | Native Android app — Kotlin, Jetpack Compose (Material 3), Retrofit |
| `table-schema.json` | Data Store schema (Puppies, FoodItems, FeedingLogs, SymptomLogs) |

---

## ⚠️ Files you need but that are NOT in this repo

Two things are gitignored on purpose because they hold secrets. Get them from
the project owner **out of band** (not via git):

1. **`android/app/src/main/assets/app_configuration_development.properties`**
   — the Catalyst mobile SDK config. Contains the OAuth **clientSecret**.
   Without it the Android app cannot initialise the SDK, so auth won't run.
   Download it from **Catalyst Console → your project → Mobile SDK → your package**.

2. **`android/keystore.properties`** + **`android/bonzaa-release.keystore`**
   — release signing. Only needed to build a *signed release* APK; a debug
   build does not need them.

Everything else (source, Gradle config, web client, function) is in the repo.

---

## Running it

### Backend + web client
```bash
npm install -g zcatalyst-cli          # needs Node 18+, and Node 22 for local serve
catalyst login --dc in -ni            # browser OAuth, once
catalyst serve                        # local; proxies Data Store to Development
catalyst deploy -ni                   # deploy functions + client to Development
```
The API is **auth-gated**: every route except `/health` requires a valid
Catalyst user (enforced in `functions/bonzaa_api/index.js`). Anonymous calls
get `401`.

### Android app
1. Drop the config file (above) into `android/app/src/main/assets/`.
2. Open `android/` in Android Studio (Gradle 9.1.0 / AGP 8.13.0 / Kotlin 2.2.20).
3. Run on a device or emulator (minSdk 26).

Notes for a clean build:
- Maven repo `https://maven.zohodl.com`, SDK `com.zoho.catalyst:android-sdk:3.0.4`.
- `android.enableJetifier=true` is **required** (the SDK ships the legacy
  Android Support Library, which otherwise breaks the manifest merge).

---

## 🔴 Open issue — help wanted

**Native Google sign-in on Android fails with `DEVELOPER_ERROR`** ("Something
went wrong" on the Google screen). Web Google sign-in works; Android does not.

- **Cause:** native Google Sign-In validates the app by **signing SHA-1 +
  package name**. An **Android** OAuth client (package `com.bonzaa.app` + the
  app's SHA-1) must exist in the **same Google Cloud project** as the web
  OAuth client Catalyst uses. This is not documented by the Catalyst plugin.
- **Fingerprints to register:**
  - Debug: `FB:17:8E:30:56:34:E1:5A:1E:58:21:46:3D:54:DA:5F:B7:C6:06:08`
  - Release: `4C:CC:6D:E4:39:54:2C:30:E4:21:9A:0D:97:05:E8:01:8B:51:3C:28`
- **Relevant code:** `android/.../data/CatalystAuth.kt` (the `login()` wrapper);
  redirect is `redirectUrl=bonzaa` / `url_scheme=bonzaa://`.
- **Current status:** the Android OAuth clients exist in the right project;
  we are verifying the SHA-1 values match the installed build. On a real
  phone the failure logs as `ConnectionResult{statusCode=DEVELOPER_ERROR}`.

A full write-up of every gap we hit building on Catalyst (SDK coords, docs
contradictions, Security Rules, etc.) is kept separately as the "Catalyst
Plugin Gaps" report.

---

## Environment

| | |
|---|---|
| Catalyst project | `5433000043229181` (org `60031184881`, IN DC) |
| Android SDK | `com.zoho.catalyst:android-sdk:3.0.4` |
| Web SDK | `catalystWebSDK.js 4.6.1` |
| App package | `com.bonzaa.app` |
| Build | Gradle 9.1.0 · AGP 8.13.0 · Kotlin 2.2.20 |
