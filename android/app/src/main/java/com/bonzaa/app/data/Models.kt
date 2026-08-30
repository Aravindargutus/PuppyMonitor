package com.bonzaa.app.data

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonPrimitive

/**
 * Catalyst returns numerics as strings in insert responses ("100.00") but as
 * numbers in query responses, and booleans as "true"/"false" strings in some
 * paths. These serializers accept either representation.
 */
object FlexibleDouble : KSerializer<Double> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleDouble", PrimitiveKind.DOUBLE)

    override fun deserialize(decoder: Decoder): Double {
        val jd = decoder as? JsonDecoder ?: return decoder.decodeDouble()
        val prim = jd.decodeJsonElement().jsonPrimitive
        return prim.doubleOrNull ?: prim.content.toDoubleOrNull() ?: 0.0
    }

    override fun serialize(encoder: Encoder, value: Double) = encoder.encodeDouble(value)
}

object FlexibleBoolean : KSerializer<Boolean> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleBoolean", PrimitiveKind.BOOLEAN)

    override fun deserialize(decoder: Decoder): Boolean {
        val jd = decoder as? JsonDecoder ?: return decoder.decodeBoolean()
        val prim = jd.decodeJsonElement().jsonPrimitive
        return prim.booleanOrNull ?: (prim.content == "true")
    }

    override fun serialize(encoder: Encoder, value: Boolean) = encoder.encodeBoolean(value)
}

@Serializable
data class Puppy(
    @SerialName("ROWID") val id: String,
    @SerialName("Name") val name: String,
    @SerialName("Breed") val breed: String? = null,
    @SerialName("BirthDate") val birthDate: String? = null,
    @SerialName("PhotoUrl") val photoUrl: String? = null,
    @SerialName("Notes") val notes: String? = null,
)

@Serializable
data class FoodItem(
    @SerialName("ROWID") val id: String,
    @SerialName("Name") val name: String,
    @SerialName("Brand") val brand: String? = null,
    @SerialName("FoodType") val foodType: String? = null,
    @SerialName("UsualPuppyId") val usualPuppyId: String? = null,
    @SerialName("Notes") val notes: String? = null,
)

@Serializable
data class Feeding(
    @SerialName("ROWID") val id: String,
    @SerialName("PuppyId") val puppyId: String,
    @SerialName("FoodItemId") val foodItemId: String,
    @SerialName("Quantity") @Serializable(with = FlexibleDouble::class) val quantity: Double = 0.0,
    @SerialName("Unit") val unit: String? = "g",
    @SerialName("MealSlot") val mealSlot: String,
    @SerialName("FedAt") val fedAt: String,
    @SerialName("FedBy") val fedBy: String? = null,
    @SerialName("IsNewFood") @Serializable(with = FlexibleBoolean::class) val isNewFood: Boolean = false,
    @SerialName("Notes") val notes: String? = null,
)

@Serializable
data class SymptomLog(
    @SerialName("ROWID") val id: String,
    @SerialName("PuppyId") val puppyId: String,
    @SerialName("Symptom") val symptom: String,
    @SerialName("Severity") val severity: String? = "mild",
    @SerialName("OnsetAt") val onsetAt: String,
    @SerialName("Notes") val notes: String? = null,
)

@Serializable
data class SuspectFeeding(
    @SerialName("fed_at") val fedAt: String,
    @SerialName("meal_slot") val mealSlot: String,
    @Serializable(with = FlexibleDouble::class) val quantity: Double = 0.0,
    val unit: String? = "g",
)

@Serializable
data class Suspect(
    @SerialName("food_item_id") val foodItemId: String,
    val name: String,
    val brand: String? = null,
    @SerialName("food_type") val foodType: String? = null,
    @Serializable(with = FlexibleDouble::class) val score: Double,
    @SerialName("feedings_in_window") val feedingsInWindow: List<SuspectFeeding> = emptyList(),
    @SerialName("was_new_food") val wasNewFood: Boolean = false,
    @SerialName("preceded_prior_incidents") val precededPriorIncidents: Int = 0,
    @SerialName("fed_times_in_last_14_days") val fedTimesInLast14Days: Int = 0,
)

@Serializable
data class SuspectAnalysis(
    @SerialName("window_start") val windowStart: String,
    @SerialName("window_end") val windowEnd: String,
    val note: String? = null,
    val suspects: List<Suspect> = emptyList(),
)

/* ---------- response wrappers ---------- */

@Serializable data class PuppiesResponse(val puppies: List<Puppy>)
@Serializable data class PuppyResponse(val puppy: Puppy)
@Serializable data class FoodsResponse(val foods: List<FoodItem>)
@Serializable data class FoodResponse(val food: FoodItem)
@Serializable data class FeedingsResponse(val feedings: List<Feeding>)
@Serializable data class FeedingResponse(val feeding: Feeding)
@Serializable data class SymptomsResponse(val symptoms: List<SymptomLog>)
@Serializable data class SymptomCreateResponse(val symptom: SymptomLog, val analysis: SuspectAnalysis)
@Serializable data class DeleteResponse(val deleted: String)

/* ---------- request bodies ---------- */

@Serializable
data class NewPuppy(
    val name: String,
    val breed: String? = null,
    @SerialName("birth_date") val birthDate: String? = null,
    val notes: String? = null,
)

@Serializable
data class NewFood(
    val name: String,
    val brand: String? = null,
    @SerialName("food_type") val foodType: String? = null,
    @SerialName("usual_puppy_id") val usualPuppyId: String? = null,
    val notes: String? = null,
)

@Serializable
data class UpdateFood(
    val id: String,
    val name: String,
    val brand: String? = null,
    @SerialName("food_type") val foodType: String? = null,
    @SerialName("usual_puppy_id") val usualPuppyId: String? = null,
)

@Serializable
data class NewFeeding(
    @SerialName("puppy_id") val puppyId: String,
    @SerialName("food_item_id") val foodItemId: String,
    val quantity: Double = 0.0,
    val unit: String = "g",
    @SerialName("meal_slot") val mealSlot: String,
    @SerialName("fed_at") val fedAt: String,
    @SerialName("fed_by") val fedBy: String? = null,
    @SerialName("is_new_food") val isNewFood: Boolean = false,
    val notes: String? = null,
)

@Serializable
data class NewSymptom(
    @SerialName("puppy_id") val puppyId: String,
    val symptom: String,
    val severity: String = "mild",
    @SerialName("onset_at") val onsetAt: String,
    val notes: String? = null,
)
