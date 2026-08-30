package com.bonzaa.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.bonzaa.app.UiState
import com.bonzaa.app.data.FoodItem
import com.bonzaa.app.ui.theme.Honey
import com.bonzaa.app.ui.theme.Sage
import com.bonzaa.app.ui.theme.SageDeep

val FoodTypes = listOf("kibble", "wet food", "treat", "human food", "supplement", "other")

fun foodEmoji(type: String?): String = when (type) {
    "kibble" -> "🥣"
    "wet food" -> "🥫"
    "treat" -> "🦴"
    "human food" -> "🍗"
    "supplement" -> "💊"
    else -> "🍽️"
}

@Composable
fun FoodsScreen(state: UiState, onEdit: (FoodItem) -> Unit) {
    val lang = com.bonzaa.app.ui.LocalLang.current
    if (state.foods.isEmpty()) {
        EmptyState(
            emoji = "🦴",
            title = lang["no_foods_title"],
            message = lang["no_foods_msg"],
        )
        return
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            start = 20.dp, end = 20.dp, top = 8.dp, bottom = 96.dp,
        ),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Text(
                lang["foods_hint"],
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        items(state.foods, key = { it.id }) { food ->
            FoodCard(
                food = food,
                puppyName = state.puppies.find { it.id == food.usualPuppyId }?.name,
                onClick = { onEdit(food) },
            )
        }
    }
}

@Composable
private fun FoodCard(food: FoodItem, puppyName: String?, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(foodEmoji(food.foodType), style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(food.name, style = MaterialTheme.typography.titleMedium)
                    if (puppyName != null) {
                        TagChip(
                            text = "🐶 ${puppyName.uppercase()}",
                            bg = Honey.copy(alpha = 0.4f),
                            fg = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }
                food.brand?.takeIf { it.isNotBlank() }?.let {
                    Text(
                        it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            TagChip(
                text = com.bonzaa.app.ui.LocalLang.current.ft(food.foodType).uppercase(),
                bg = Sage.copy(alpha = 0.15f),
                fg = SageDeep,
            )
        }
    }
}
