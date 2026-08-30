package com.bonzaa.app.ui.screens

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.bonzaa.app.UiState
import com.bonzaa.app.data.Puppy
import com.bonzaa.app.ui.theme.Terracotta
import java.time.LocalDate
import java.time.Period

@Composable
fun PuppiesScreen(state: UiState, onDelete: (String) -> Unit) {
    val lang = com.bonzaa.app.ui.LocalLang.current
    var confirmDelete by remember { mutableStateOf<Puppy?>(null) }

    if (state.puppies.isEmpty()) {
        EmptyState(
            emoji = "🐶",
            title = lang["no_puppies_title"],
            message = lang["no_puppies_msg"],
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
        items(state.puppies, key = { it.id }) { puppy ->
            PuppyCard(puppy = puppy, onDelete = { confirmDelete = puppy })
        }
    }

    confirmDelete?.let { puppy ->
        AlertDialog(
            onDismissRequest = { confirmDelete = null },
            title = { Text(lang.fmt("remove_q", puppy.name)) },
            text = { Text(lang["remove_msg"]) },
            confirmButton = {
                TextButton(onClick = {
                    onDelete(puppy.id)
                    confirmDelete = null
                }) { Text(lang["remove"], color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { confirmDelete = null }) { Text(lang["cancel"]) }
            },
        )
    }
}

private fun ageLabel(birthDate: String?): String? {
    if (birthDate.isNullOrBlank()) return null
    return try {
        val period = Period.between(LocalDate.parse(birthDate.take(10)), LocalDate.now())
        when {
            period.years > 0 -> "${period.years}y ${period.months}m old"
            period.months > 0 -> "${period.months}m ${period.days}d old"
            else -> "${period.days} days old"
        }
    } catch (e: Exception) {
        null
    }
}

@Composable
private fun PuppyCard(puppy: Puppy, onDelete: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            modifier = Modifier.padding(start = 16.dp, end = 4.dp, top = 14.dp, bottom = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            LetterAvatar(name = puppy.name, color = Terracotta, size = 52)
            Spacer(Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(puppy.name, style = MaterialTheme.typography.titleLarge)
                val sub = listOfNotNull(
                    puppy.breed?.takeIf { it.isNotBlank() },
                    ageLabel(puppy.birthDate),
                ).joinToString(" · ")
                if (sub.isNotBlank()) {
                    Text(
                        sub,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            IconButton(onClick = onDelete) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Remove puppy",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f),
                )
            }
        }
    }
}
