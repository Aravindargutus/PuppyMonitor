package com.bonzaa.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.bonzaa.app.UiState
import com.bonzaa.app.data.Feeding
import com.bonzaa.app.ui.theme.Honey
import com.bonzaa.app.ui.theme.Sage
import com.bonzaa.app.ui.theme.Terracotta
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Composable
fun TodayScreen(
    state: UiState,
    onSelectPuppy: (String) -> Unit,
    onSelectDate: (LocalDate) -> Unit,
    onDeleteFeeding: (String) -> Unit,
) {
    val lang = com.bonzaa.app.ui.LocalLang.current
    val headerFmt = DateTimeFormatter.ofPattern("EEE, d MMM")

    Column(modifier = Modifier.fillMaxSize()) {

        // Puppy selector
        if (state.puppies.isNotEmpty()) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 20.dp),
            ) {
                items(state.puppies) { puppy ->
                    FilterChip(
                        selected = puppy.id == state.selectedPuppyId,
                        onClick = { onSelectPuppy(puppy.id) },
                        label = { Text(puppy.name) },
                        leadingIcon = { Text("🐶") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                            selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer,
                        ),
                    )
                }
            }
        }

        // Date navigator
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = { onSelectDate(state.date.minusDays(1)) }) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Previous day")
            }
            Text(
                text = if (state.date == LocalDate.now()) "${lang["today_prefix"]} · ${state.date.format(headerFmt)}"
                else state.date.format(headerFmt),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            IconButton(
                onClick = { onSelectDate(state.date.plusDays(1)) },
                enabled = state.date < LocalDate.now(),
            ) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Next day")
            }
        }

        if (state.puppies.isEmpty()) {
            EmptyState(
                emoji = "🐾",
                title = lang["welcome_title"],
                message = lang["welcome_msg"],
            )
            return@Column
        }

        val bySlot = state.feedings.groupBy { it.mealSlot }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(
                start = 20.dp, end = 20.dp, bottom = 96.dp,
            ),
        ) {
            MealSlots.forEach { slot ->
                item(key = "header_${slot.key}") {
                    SectionHeader(slot.emoji, lang[slot.key])
                }
                val meals = bySlot[slot.key].orEmpty()
                if (meals.isEmpty()) {
                    item(key = "empty_${slot.key}") {
                        Text(
                            lang["no_meals"],
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(start = 4.dp, bottom = 4.dp),
                        )
                    }
                } else {
                    items(meals, key = { it.id }) { feeding ->
                        MealCard(
                            feeding = feeding,
                            foodName = state.foodName(feeding.foodItemId),
                            onDelete = { onDeleteFeeding(feeding.id) },
                        )
                        Spacer(Modifier.height(8.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun MealCard(feeding: Feeding, foodName: String, onDelete: () -> Unit) {
    val lang = com.bonzaa.app.ui.LocalLang.current
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            modifier = Modifier.padding(start = 16.dp, end = 4.dp, top = 12.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            LetterAvatar(name = foodName, color = Terracotta)
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(foodName, style = MaterialTheme.typography.titleMedium)
                    if (feeding.isNewFood) {
                        TagChip(lang["badge_new"], Honey.copy(alpha = 0.4f), MaterialTheme.colorScheme.onSurface)
                    }
                }
                val time = feeding.fedAt.substringAfter(' ').take(5)
                val qty = if (feeding.quantity > 0.0) {
                    "${feeding.quantity.let { if (it % 1.0 == 0.0) it.toInt().toString() else it.toString() }} ${feeding.unit ?: ""} · "
                } else ""
                val fedBy = feeding.fedBy?.takeIf { it.isNotBlank() }?.let { " · ${lang["by"]} $it" } ?: ""
                Text(
                    "$qty$time$fedBy",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            IconButton(onClick = onDelete) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Delete meal",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f),
                )
            }
        }
    }
}
