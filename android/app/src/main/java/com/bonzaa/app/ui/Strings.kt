package com.bonzaa.app.ui

import androidx.compose.runtime.staticCompositionLocalOf

/**
 * Dictionary-based i18n. Canonical values stored in the Data Store (symptom keys,
 * meal slots, food types) stay English; only the UI labels are localized.
 * Parametrized strings use %s / %d with String.format.
 */
object Strings {
    val en = mapOf(
        "daily_meals" to "Daily meals", "food_catalog" to "Food catalog", "your_pack" to "Your pack",
        "meals_of" to "%s's meals", "health_of" to "%s's health",
        "tab_today" to "Today", "tab_foods" to "Foods", "tab_insights" to "Insights", "tab_puppies" to "Puppies",
        "today_prefix" to "Today", "welcome_title" to "Welcome to Bonzaa",
        "welcome_msg" to "Add your first puppy in the Puppies tab to start tracking meals.",
        "morning" to "Morning", "noon" to "Noon", "evening" to "Evening", "night" to "Night",
        "no_meals" to "No meals logged", "badge_new" to "NEW", "by" to "by",
        "log_meal" to "🍽️ Log a meal", "food" to "Food", "meal_slot" to "Meal slot",
        "quantity" to "Quantity", "unit" to "Unit", "time" to "Time (HH:mm)",
        "fed_by" to "Fed by (optional)",
        "first_time_q" to "First time eating this?",
        "first_time_hint" to "New foods are prime suspects if tummy trouble follows.",
        "save_meal" to "Save meal",
        "add_food_first" to "Add a food in the Foods tab first — every meal points at a food from the catalog.",
        "add_food" to "🦴 Add a food", "edit_food" to "🦴 Edit food", "name" to "Name",
        "brand_opt" to "Brand (optional)", "type" to "Type", "usually_for" to "Usually for",
        "everyone" to "👨‍👩‍👧 Everyone", "save_food" to "Save food", "save_changes" to "Save changes",
        "foods_hint" to "Tap a food to edit it or tag who it's usually for.",
        "no_foods_title" to "No foods yet",
        "no_foods_msg" to "Add every food, brand, and treat your puppies eat. Each meal you log points at one of these, which is what makes the suspect analysis possible.",
        "add_puppy" to "🐶 Add a puppy", "breed_opt" to "Breed (optional)",
        "birth_opt" to "Birth date (YYYY-MM-DD, optional)", "save_puppy" to "Save puppy",
        "no_puppies_title" to "No puppies yet",
        "no_puppies_msg" to "Add your puppies with the + button — then start logging their meals from morning to night.",
        "log_symptom" to "🤒 Log a reaction",
        "symptom_desc" to "For %s — Bonzaa will immediately check what was eaten in the 2–48 hours before it started.",
        "symptom" to "What happened?", "severity" to "Severity",
        "onset" to "When it started (yyyy-MM-dd HH:mm)", "notes_opt" to "Notes (optional)",
        "save_analyze" to "Save & analyze",
        "mild" to "mild", "moderate" to "moderate", "severe" to "severe",
        "suspects_title" to "🔍 Suspect foods", "onset_at" to "onset",
        "in_window" to "%d× in the 2–48h window", "last14" to "%d× in last 14 days",
        "before_incidents" to "before %d earlier incident(s)", "new_food_badge" to "NEW FOOD",
        "vet_note" to "Correlation aid only — confirm with a veterinarian.",
        "no_window_meals" to "No meals were logged in the 2–48 hours before it started, so there is nothing to analyze. Keep logging every meal for better results.",
        "insights_hint" to "Tap an incident to see which foods were the likely cause.",
        "no_incidents_title" to "No incidents logged",
        "no_incidents_msg" to "Hopefully it stays that way! If %s ever feels unwell — vomiting, strange drool, anything — log it with the + button and Bonzaa will analyze recent meals for likely culprits.",
        "add_puppy_first_title" to "Add a puppy first",
        "add_puppy_first_msg" to "Health incidents are tracked per puppy.",
        "remove_q" to "Remove %s?",
        "remove_msg" to "This removes the puppy from Bonzaa. Meal and symptom history stays in the database but will no longer be shown.",
        "cancel" to "Cancel", "remove" to "Remove", "your_puppy" to "your puppy",
        "reminder_missed" to "⏰ %s — not logged yet. Tap to log now.",
        "notif_title" to "🐾 Bonzaa — feeding time!",
        "notif_body" to "%s meal is not logged yet. Feed your puppy and log it.",
    )

    val ta = mapOf(
        "daily_meals" to "தினசரி உணவுகள்", "food_catalog" to "உணவு பட்டியல்", "your_pack" to "உங்கள் குட்டிகள்",
        "meals_of" to "%s — உணவுகள்", "health_of" to "%s — நலம்",
        "tab_today" to "இன்று", "tab_foods" to "உணவுகள்", "tab_insights" to "நலம்", "tab_puppies" to "குட்டிகள்",
        "today_prefix" to "இன்று", "welcome_title" to "Bonzaa-வுக்கு வரவேற்பு!",
        "welcome_msg" to "உணவு பதிவை தொடங்க குட்டிகள் தாவலில் உங்கள் முதல் குட்டியை சேர்க்கவும்.",
        "morning" to "காலை", "noon" to "மதியம்", "evening" to "மாலை", "night" to "இரவு",
        "no_meals" to "உணவு பதிவில்லை", "badge_new" to "புதியது", "by" to "ஊட்டியவர்",
        "log_meal" to "🍽️ உணவு பதிவு", "food" to "உணவு", "meal_slot" to "உணவு நேரம்",
        "quantity" to "அளவு", "unit" to "அலகு", "time" to "நேரம் (HH:mm)",
        "fed_by" to "ஊட்டியவர் (விருப்பம்)",
        "first_time_q" to "இதை முதல் முறையாக சாப்பிடுகிறதா?",
        "first_time_hint" to "வயிற்று பிரச்சனை வந்தால் புதிய உணவுகளே முக்கிய சந்தேகம்.",
        "save_meal" to "சேமி",
        "add_food_first" to "முதலில் உணவுகள் தாவலில் ஒரு உணவை சேர்க்கவும் — ஒவ்வொரு உணவு பதிவும் பட்டியலில் உள்ள ஒரு உணவை குறிக்கும்.",
        "add_food" to "🦴 உணவு சேர்க்க", "edit_food" to "🦴 உணவை திருத்த", "name" to "பெயர்",
        "brand_opt" to "பிராண்ட் (விருப்பம்)", "type" to "வகை", "usually_for" to "வழக்கமாக யாருக்கு",
        "everyone" to "👨‍👩‍👧 எல்லோருக்கும்", "save_food" to "சேமி", "save_changes" to "மாற்றங்களை சேமி",
        "foods_hint" to "உணவை திருத்த அல்லது குட்டியுடன் இணைக்க தட்டவும்.",
        "no_foods_title" to "இன்னும் உணவுகள் இல்லை",
        "no_foods_msg" to "உங்கள் குட்டிகள் சாப்பிடும் ஒவ்வொரு உணவு, பிராண்ட், சிற்றுண்டியையும் சேர்க்கவும். ஒவ்வொரு உணவு பதிவும் இவற்றில் ஒன்றை குறிக்கும் — அதுவே சந்தேக உணவு ஆய்வை சாத்தியமாக்கும்.",
        "add_puppy" to "🐶 குட்டியை சேர்க்க", "breed_opt" to "இனம் (விருப்பம்)",
        "birth_opt" to "பிறந்த தேதி (YYYY-MM-DD, விருப்பம்)", "save_puppy" to "சேமி",
        "no_puppies_title" to "இன்னும் குட்டிகள் இல்லை",
        "no_puppies_msg" to "+ பொத்தானை அழுத்தி உங்கள் குட்டிகளை சேர்க்கவும் — பின்னர் காலை முதல் இரவு வரை உணவு பதிவு செய்யுங்கள்.",
        "log_symptom" to "🤒 அறிகுறி பதிவு",
        "symptom_desc" to "%s-க்கு — தொடங்குவதற்கு முன் 2–48 மணி நேரத்தில் என்ன சாப்பிட்டது என்று Bonzaa உடனே ஆராயும்.",
        "symptom" to "என்ன ஆனது?", "severity" to "தீவிரம்",
        "onset" to "தொடங்கிய நேரம் (yyyy-MM-dd HH:mm)", "notes_opt" to "குறிப்பு (விருப்பம்)",
        "save_analyze" to "சேமித்து ஆராய்",
        "mild" to "லேசு", "moderate" to "மிதம்", "severe" to "கடுமை",
        "suspects_title" to "🔍 சந்தேக உணவுகள்", "onset_at" to "தொடக்கம்",
        "in_window" to "2–48மணி இடைவெளியில் %d×", "last14" to "கடந்த 14 நாட்களில் %d×",
        "before_incidents" to "முந்தைய %d சம்பவங்களுக்கு முன்பும்", "new_food_badge" to "புதிய உணவு",
        "vet_note" to "இது தொடர்பு அடிப்படையிலான உதவி மட்டுமே — கால்நடை மருத்துவரிடம் உறுதிப்படுத்தவும்.",
        "no_window_meals" to "தொடங்குவதற்கு முன் 2–48 மணி நேரத்தில் உணவு பதிவுகள் இல்லை. சிறந்த முடிவுகளுக்கு ஒவ்வொரு உணவையும் பதிவு செய்யுங்கள்.",
        "insights_hint" to "எந்த உணவு காரணமாக இருக்கலாம் என்று பார்க்க ஒரு சம்பவத்தை தட்டவும்.",
        "no_incidents_title" to "சம்பவங்கள் இல்லை",
        "no_incidents_msg" to "அப்படியே இருக்கட்டும்! %s-க்கு உடல்நிலை சரியில்லை என்றால் — வாந்தி, வித்தியாசமான உமிழ்நீர், எதுவானாலும் — + பொத்தானால் பதிவு செய்யுங்கள்; சமீபத்திய உணவுகளை Bonzaa ஆராயும்.",
        "add_puppy_first_title" to "முதலில் குட்டியை சேர்க்கவும்",
        "add_puppy_first_msg" to "நல சம்பவங்கள் குட்டி வாரியாக பதிவாகும்.",
        "remove_q" to "%s-ஐ நீக்கவா?",
        "remove_msg" to "இது குட்டியை Bonzaa-விலிருந்து நீக்கும். உணவு மற்றும் அறிகுறி வரலாறு தரவுத்தளத்தில் இருக்கும், ஆனால் காட்டப்படாது.",
        "cancel" to "ரத்து", "remove" to "நீக்கு", "your_puppy" to "உங்கள் குட்டி",
        "reminder_missed" to "⏰ %s — இன்னும் பதிவாகவில்லை. இப்போது பதிவு செய்ய தட்டவும்.",
        "notif_title" to "🐾 Bonzaa — உணவு நேரம்!",
        "notif_body" to "%s உணவு இன்னும் பதிவாகவில்லை. குட்டிக்கு உணவு கொடுத்து பதிவு செய்யவும்.",
    )

    // Canonical symptom/reaction keys → localized labels.
    val symEn = mapOf(
        "vomiting" to "vomiting", "diarrhea" to "diarrhea", "bloody drool" to "bloody drool",
        "black drool" to "black drool", "excessive drooling" to "excessive drooling",
        "swollen face" to "swollen face", "shivering" to "shivering", "lethargy" to "lethargy",
        "refusing food" to "refusing food", "itching" to "itching", "crying" to "crying / whining",
        "other" to "other",
    )
    val symTa = mapOf(
        "vomiting" to "வாந்தி", "diarrhea" to "வயிற்றுப்போக்கு", "bloody drool" to "இரத்த உமிழ்நீர்",
        "black drool" to "கருப்பு உமிழ்நீர்", "excessive drooling" to "அதிக உமிழ்நீர் வடிதல்",
        "swollen face" to "முக வீக்கம்", "shivering" to "நடுக்கம்", "lethargy" to "சோர்வு",
        "refusing food" to "உணவு மறுப்பு", "itching" to "அரிப்பு", "crying" to "அழுகை / சிணுங்கல்",
        "other" to "மற்றவை",
    )
}

class Lang(val code: String) {
    private val dict = if (code == "ta") Strings.ta else Strings.en
    private val syms = if (code == "ta") Strings.symTa else Strings.symEn
    operator fun get(key: String): String = dict[key] ?: Strings.en[key] ?: key
    fun fmt(key: String, vararg args: Any?): String = get(key).format(*args)
    fun sym(key: String): String = syms[key] ?: Strings.symEn[key] ?: key
}

val LocalLang = staticCompositionLocalOf { Lang("en") }

// Canonical keys, stored in English in the Data Store.
val SymptomKeys = listOf(
    "vomiting", "diarrhea", "bloody drool", "black drool", "excessive drooling",
    "swollen face", "shivering", "lethargy", "refusing food", "itching", "crying", "other",
)
