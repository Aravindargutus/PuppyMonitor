package com.bonzaa.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bonzaa.app.data.ApiClient
import com.bonzaa.app.data.Feeding
import com.bonzaa.app.data.FoodItem
import com.bonzaa.app.data.NewFeeding
import com.bonzaa.app.data.NewFood
import com.bonzaa.app.data.NewPuppy
import com.bonzaa.app.data.NewSymptom
import com.bonzaa.app.data.Puppy
import com.bonzaa.app.data.SuspectAnalysis
import com.bonzaa.app.data.UpdateFood
import com.bonzaa.app.data.SymptomLog
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

data class UiState(
    val loading: Boolean = false,
    val error: String? = null,
    val puppies: List<Puppy> = emptyList(),
    val selectedPuppyId: String? = null,
    val foods: List<FoodItem> = emptyList(),
    val date: LocalDate = LocalDate.now(),
    val feedings: List<Feeding> = emptyList(),
    val symptoms: List<SymptomLog> = emptyList(),
    val analysis: SuspectAnalysis? = null,
    val analysisFor: SymptomLog? = null,
) {
    val selectedPuppy: Puppy? get() = puppies.find { it.id == selectedPuppyId }
    fun foodName(id: String): String = foods.find { it.id == id }?.name ?: "Unknown food"
}

class AppViewModel : ViewModel() {

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    private val api = ApiClient.api
    private val dateFmt = DateTimeFormatter.ISO_LOCAL_DATE

    init {
        refreshAll()
    }

    private fun launchSafe(block: suspend () -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                block()
                _state.value = _state.value.copy(loading = false)
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    loading = false,
                    error = e.message ?: "Something went wrong",
                )
            }
        }
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }

    fun refreshAll() = launchSafe {
        val puppies = api.getPuppies().puppies
        val foods = api.getFoods().foods
        val selected = _state.value.selectedPuppyId
            ?.takeIf { id -> puppies.any { it.id == id } }
            ?: puppies.firstOrNull()?.id
        _state.value = _state.value.copy(
            puppies = puppies,
            foods = foods,
            selectedPuppyId = selected,
        )
        selected?.let { loadDay(it, _state.value.date) }
    }

    fun selectPuppy(id: String) = launchSafe {
        _state.value = _state.value.copy(selectedPuppyId = id)
        loadDay(id, _state.value.date)
        loadSymptoms(id)
    }

    fun selectDate(date: LocalDate) = launchSafe {
        _state.value = _state.value.copy(date = date)
        _state.value.selectedPuppyId?.let { loadDay(it, date) }
    }

    private suspend fun loadDay(puppyId: String, date: LocalDate) {
        val feedings = api.getFeedings(puppyId, date.format(dateFmt)).feedings
        _state.value = _state.value.copy(feedings = feedings.sortedBy { it.fedAt })
    }

    private suspend fun loadSymptoms(puppyId: String) {
        val symptoms = api.getSymptoms(puppyId).symptoms
        _state.value = _state.value.copy(symptoms = symptoms)
    }

    fun refreshSymptoms() = launchSafe {
        _state.value.selectedPuppyId?.let { loadSymptoms(it) }
    }

    fun addPuppy(name: String, breed: String, birthDate: String?) = launchSafe {
        api.addPuppy(NewPuppy(name = name, breed = breed.ifBlank { null }, birthDate = birthDate))
        val puppies = api.getPuppies().puppies
        val selected = _state.value.selectedPuppyId ?: puppies.firstOrNull()?.id
        _state.value = _state.value.copy(puppies = puppies, selectedPuppyId = selected)
    }

    fun deletePuppy(id: String) = launchSafe {
        api.deletePuppy(id)
        val puppies = api.getPuppies().puppies
        val selected = puppies.firstOrNull()?.id
        _state.value = _state.value.copy(puppies = puppies, selectedPuppyId = selected)
    }

    fun addFood(name: String, brand: String, type: String, usualPuppyId: String?) = launchSafe {
        api.addFood(NewFood(name = name, brand = brand.ifBlank { null }, foodType = type, usualPuppyId = usualPuppyId))
        _state.value = _state.value.copy(foods = api.getFoods().foods)
    }

    fun updateFood(id: String, name: String, brand: String, type: String, usualPuppyId: String?) = launchSafe {
        api.updateFood(UpdateFood(id = id, name = name, brand = brand.ifBlank { null }, foodType = type, usualPuppyId = usualPuppyId))
        _state.value = _state.value.copy(foods = api.getFoods().foods)
    }

    fun addFeeding(
        foodItemId: String,
        quantity: Double,
        unit: String,
        mealSlot: String,
        time: String, // HH:mm
        fedBy: String,
        isNewFood: Boolean,
    ) = launchSafe {
        val puppyId = _state.value.selectedPuppyId ?: return@launchSafe
        val fedAt = "${_state.value.date.format(dateFmt)} $time:00"
        api.addFeeding(
            NewFeeding(
                puppyId = puppyId,
                foodItemId = foodItemId,
                quantity = quantity,
                unit = unit,
                mealSlot = mealSlot,
                fedAt = fedAt,
                fedBy = fedBy.ifBlank { null },
                isNewFood = isNewFood,
            )
        )
        loadDay(puppyId, _state.value.date)
    }

    fun deleteFeeding(id: String) = launchSafe {
        api.deleteFeeding(id)
        _state.value.selectedPuppyId?.let { loadDay(it, _state.value.date) }
    }

    fun logSymptom(symptom: String, severity: String, onsetAt: String, notes: String) = launchSafe {
        val puppyId = _state.value.selectedPuppyId ?: return@launchSafe
        val resp = api.logSymptom(
            NewSymptom(
                puppyId = puppyId,
                symptom = symptom,
                severity = severity,
                onsetAt = onsetAt,
                notes = notes.ifBlank { null },
            )
        )
        _state.value = _state.value.copy(analysis = resp.analysis, analysisFor = resp.symptom)
        loadSymptoms(puppyId)
    }

    fun loadSuspectsFor(symptom: SymptomLog) = launchSafe {
        val analysis = api.getSuspects(symptom.puppyId, symptom.onsetAt)
        _state.value = _state.value.copy(analysis = analysis, analysisFor = symptom)
    }

    fun dismissAnalysis() {
        _state.value = _state.value.copy(analysis = null, analysisFor = null)
    }
}
