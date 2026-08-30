package com.bonzaa.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.bonzaa.app.data.FoodItem
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/* ---------- Add meal ---------- */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddMealSheet(
    foods: List<FoodItem>,
    presetSlot: String? = null,
    onDismiss: () -> Unit,
    onSave: (foodId: String, qty: Double, unit: String, slot: String, time: String, fedBy: String, isNew: Boolean) -> Unit,
) {
    val lang = com.bonzaa.app.ui.LocalLang.current
    var foodId by remember { mutableStateOf(foods.firstOrNull()?.id) }
    var slot by remember { mutableStateOf(presetSlot ?: defaultSlotForNow()) }
    var time by remember { mutableStateOf(slotInfo(slot).defaultTime) }
    var qty by remember { mutableStateOf("") }
    var unit by remember { mutableStateOf("g") }
    var fedBy by remember { mutableStateOf("") }
    var isNew by remember { mutableStateOf(false) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 24.dp, end = 24.dp, bottom = 40.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(lang["log_meal"], style = MaterialTheme.typography.headlineSmall)

            if (foods.isEmpty()) {
                Text(
                    lang["add_food_first"],
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            } else {
                Text(lang["food"], style = MaterialTheme.typography.labelLarge)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(foods, key = { it.id }) { food ->
                        FilterChip(
                            selected = food.id == foodId,
                            onClick = { foodId = food.id },
                            label = { Text(food.name) },
                            leadingIcon = { Text(foodEmoji(food.foodType)) },
                        )
                    }
                }

                Text(lang["meal_slot"], style = MaterialTheme.typography.labelLarge)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    MealSlots.forEach { s ->
                        FilterChip(
                            selected = slot == s.key,
                            onClick = {
                                slot = s.key
                                time = s.defaultTime
                            },
                            label = { Text("${s.emoji} ${lang[s.key]}") },
                        )
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = qty,
                        onValueChange = { qty = it.filter { c -> c.isDigit() || c == '.' } },
                        label = { Text(lang["quantity"]) },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = unit,
                        onValueChange = { unit = it },
                        label = { Text(lang["unit"]) },
                        modifier = Modifier.weight(0.7f),
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = time,
                        onValueChange = { time = it },
                        label = { Text(lang["time"]) },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                    )
                }

                OutlinedTextField(
                    value = fedBy,
                    onValueChange = { fedBy = it },
                    label = { Text(lang["fed_by"]) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(lang["first_time_q"], style = MaterialTheme.typography.bodyLarge)
                        Text(
                            lang["first_time_hint"],
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Switch(checked = isNew, onCheckedChange = { isNew = it })
                }

                Button(
                    onClick = {
                        val id = foodId ?: return@Button
                        val t = if (Regex("^\\d{2}:\\d{2}$").matches(time)) time else slotInfo(slot).defaultTime
                        onSave(id, qty.toDoubleOrNull() ?: 0.0, unit.ifBlank { "g" }, slot, t, fedBy, isNew)
                    },
                    enabled = foodId != null,
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(lang["save_meal"]) }
            }
        }
    }
}

private fun defaultSlotForNow(): String {
    val hour = LocalDateTime.now().hour
    return when {
        hour < 11 -> "morning"
        hour < 15 -> "noon"
        hour < 19 -> "evening"
        else -> "night"
    }
}

/* ---------- Add food ---------- */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddFoodSheet(
    puppies: List<com.bonzaa.app.data.Puppy>,
    existing: com.bonzaa.app.data.FoodItem? = null,
    onDismiss: () -> Unit,
    onSave: (name: String, brand: String, type: String, usualPuppyId: String?) -> Unit,
) {
    val lang = com.bonzaa.app.ui.LocalLang.current
    var name by remember { mutableStateOf(existing?.name ?: "") }
    var brand by remember { mutableStateOf(existing?.brand ?: "") }
    var type by remember { mutableStateOf(existing?.foodType ?: FoodTypes.first()) }
    var usualPuppyId by remember { mutableStateOf(existing?.usualPuppyId) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 24.dp, end = 24.dp, bottom = 40.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(if (existing == null) lang["add_food"] else lang["edit_food"], style = MaterialTheme.typography.headlineSmall)
            OutlinedTextField(
                value = name, onValueChange = { name = it },
                label = { Text(lang["name"]) }, modifier = Modifier.fillMaxWidth(), singleLine = true,
            )
            OutlinedTextField(
                value = brand, onValueChange = { brand = it },
                label = { Text(lang["brand_opt"]) }, modifier = Modifier.fillMaxWidth(), singleLine = true,
            )
            Text(lang["type"], style = MaterialTheme.typography.labelLarge)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(FoodTypes) { t ->
                    FilterChip(
                        selected = type == t,
                        onClick = { type = t },
                        label = { Text("${foodEmoji(t)} $t") },
                    )
                }
            }
            if (puppies.isNotEmpty()) {
                Text(lang["usually_for"], style = MaterialTheme.typography.labelLarge)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item {
                        FilterChip(
                            selected = usualPuppyId == null,
                            onClick = { usualPuppyId = null },
                            label = { Text(lang["everyone"]) },
                        )
                    }
                    items(puppies, key = { it.id }) { p ->
                        FilterChip(
                            selected = usualPuppyId == p.id,
                            onClick = { usualPuppyId = p.id },
                            label = { Text("🐶 ${p.name}") },
                        )
                    }
                }
            }
            Button(
                onClick = { onSave(name.trim(), brand.trim(), type ?: "other", usualPuppyId) },
                enabled = name.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (existing == null) lang["save_food"] else lang["save_changes"]) }
        }
    }
}

/* ---------- Add puppy ---------- */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddPuppySheet(
    onDismiss: () -> Unit,
    onSave: (name: String, breed: String, birthDate: String?) -> Unit,
) {
    val lang = com.bonzaa.app.ui.LocalLang.current
    var name by remember { mutableStateOf("") }
    var breed by remember { mutableStateOf("") }
    var birthDate by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 24.dp, end = 24.dp, bottom = 40.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(lang["add_puppy"], style = MaterialTheme.typography.headlineSmall)
            OutlinedTextField(
                value = name, onValueChange = { name = it },
                label = { Text(lang["name"]) }, modifier = Modifier.fillMaxWidth(), singleLine = true,
            )
            OutlinedTextField(
                value = breed, onValueChange = { breed = it },
                label = { Text(lang["breed_opt"]) }, modifier = Modifier.fillMaxWidth(), singleLine = true,
            )
            OutlinedTextField(
                value = birthDate, onValueChange = { birthDate = it },
                label = { Text(lang["birth_opt"]) },
                modifier = Modifier.fillMaxWidth(), singleLine = true,
            )
            Button(
                onClick = {
                    val bd = birthDate.trim().takeIf { Regex("^\\d{4}-\\d{2}-\\d{2}$").matches(it) }
                    onSave(name.trim(), breed.trim(), bd)
                },
                enabled = name.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) { Text(lang["save_puppy"]) }
        }
    }
}

/* ---------- Log symptom / reaction ---------- */

val SeverityOptions = listOf("mild", "moderate", "severe")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogSymptomSheet(
    puppyName: String,
    onDismiss: () -> Unit,
    onSave: (symptom: String, severity: String, onsetAt: String, notes: String) -> Unit,
) {
    val lang = com.bonzaa.app.ui.LocalLang.current
    var symptom by remember { mutableStateOf(com.bonzaa.app.ui.SymptomKeys.first()) }
    var severity by remember { mutableStateOf("mild") }
    var onsetAt by remember {
        mutableStateOf(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")))
    }
    var notes by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 24.dp, end = 24.dp, bottom = 40.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(lang["log_symptom"], style = MaterialTheme.typography.headlineSmall)
            Text(
                lang.fmt("symptom_desc", puppyName),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(lang["symptom"], style = MaterialTheme.typography.labelLarge)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(com.bonzaa.app.ui.SymptomKeys) { s ->
                    FilterChip(selected = symptom == s, onClick = { symptom = s }, label = { Text(lang.sym(s)) })
                }
            }
            Text(lang["severity"], style = MaterialTheme.typography.labelLarge)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SeverityOptions.forEach { s ->
                    FilterChip(selected = severity == s, onClick = { severity = s }, label = { Text(lang[s]) })
                }
            }
            OutlinedTextField(
                value = onsetAt, onValueChange = { onsetAt = it },
                label = { Text(lang["onset"]) },
                modifier = Modifier.fillMaxWidth(), singleLine = true,
            )
            OutlinedTextField(
                value = notes, onValueChange = { notes = it },
                label = { Text(lang["notes_opt"]) }, modifier = Modifier.fillMaxWidth(),
            )
            Button(
                onClick = {
                    val normalized = onsetAt.trim().let {
                        if (Regex("^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$").matches(it)) "$it:00" else it
                    }
                    onSave(symptom, severity, normalized, notes)
                },
                enabled = Regex("^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}(:\\d{2})?$").matches(onsetAt.trim().let {
                    if (Regex("^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$").matches(it)) "$it:00" else it
                }),
                modifier = Modifier.fillMaxWidth(),
            ) { Text(lang["save_analyze"]) }
        }
    }
}
