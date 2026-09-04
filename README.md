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

## ✅ Resolved — Android Google sign-in

Android sign-in now works. Recording it here because none of it is documented
and every step looked like a misconfiguration on our side.

**Symptom:** "Something went wrong" on the Google screen, logged as
`LOGIN_ERROR : general_error`. Web Google sign-in worked throughout.

**What it actually was.** `ZCatalystApp.login(activity, googleClientID, ...)`
does a *native* Google sign-in: `requestIdToken(<client id>)`, then it posts the
resulting Google ID token to Zoho at
`/oauth/v2/native/token?grant_type=native_mobile_token` as an
`Authorization: Bearer` header. Zoho replies:

```json
{"error":"general_error"}
```

Zoho will only accept an ID token whose **audience is a Google client
registered on Zoho's side**, and the Catalyst console gives no way to register
one for the mobile SDK — `app_configuration_*.properties` has no Google field,
and no console/MCP API exposes it. Google's half was correct the whole time.

**The fix.** The SDK has a second, undocumented login overload —
`login(HashMap, onSuccess, onFailure)` — which calls
`IAMClientSDK.presentLoginScreen()`: Zoho's **hosted sign-in page in a Chrome
Custom Tab**. That is the same page the web app uses, so it offers Google plus
email/password and needs no per-app Google client. See
`android/.../data/CatalystAuth.kt`.

**Two traps worth knowing:**

- `url_scheme` must be `bonzaa`, **not** `bonzaa://`. Android matches
  `android:scheme` against the scheme alone, so `bonzaa://` can never match the
  `bonzaa://` redirect and the hosted login hangs. The native path never
  redirected, which kept this hidden.
- The IAM SDK's `showLogs()` is the only way to see why a login failed (every
  server error reaches the app as `general_error`) — but it prints the OAuth
  **`client_secret`** in request URLs. It is now gated to debuggable builds so
  it cannot reach a distributed APK.

Along the way Zoho also rate-limited the token endpoint after repeated retries
(`"You have made too many requests continuously"`), which masked the real error
for a while. If you see that, wait rather than retrying.

Native Google sign-in is no longer used, so the Android OAuth clients and their
SHA-1 fingerprints in Google Cloud are now irrelevant to this app.

A full write-up of every gap we hit building on Catalyst (SDK coords, docs
contradictions, Security Rules, etc.) is kept separately as the "Catalyst
Plugin Gaps" report.

---

## 🟡 Known limitation — OAuth redirect uses a bare custom scheme

Sign-in redirects back into the app via `bonzaa://`, a plain custom URI
scheme, not a verified Android App Link. Any other app that declares an
identical `<data android:scheme="bonzaa">` intent filter can register itself
as a candidate handler for that redirect and would show up in the OS's
chooser alongside Bonzaa — the classic custom-scheme interception risk that
App Links / PKCE / `state` validation exist to close off.

This isn't something we can patch from app code: `ZCatalystRedirectActivity`,
the scheme, and the whole redirect handshake live inside Zoho's closed-source
Catalyst SDK, and the redirect URI shape (`bonzaa`, not an `https://` App
Link) is what Catalyst's console has registered for this project. We did not
find PKCE or `state`-parameter handling in the SDK's bytecode, but we also
don't have visibility into the full handshake to be certain there's no other
mitigation in play.

If this needs closing, it's a question for Zoho (does the Mobile SDK support
App Link redirects or PKCE?), not a code change here. Until then, the
practical exposure is bounded by the OS's own chooser UI — a malicious app
still has to win a user's tap in a disambiguation dialog, not intercept
silently — but it's a real gap, not a dismissed one.

---

## Environment

| | |
|---|---|
| Catalyst project | `5433000043229181` (org `60031184881`, IN DC) |
| Android SDK | `com.zoho.catalyst:android-sdk:3.0.4` |
| Web SDK | `catalystWebSDK.js 4.6.1` |
| App package | `com.bonzaa.app` |
| Build | Gradle 9.1.0 · AGP 8.13.0 · Kotlin 2.2.20 |
