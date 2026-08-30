package com.bonzaa.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.bonzaa.app.UiState
import com.bonzaa.app.data.Suspect
import com.bonzaa.app.data.SymptomLog
import com.bonzaa.app.ui.theme.DangerRed
import com.bonzaa.app.ui.theme.Honey
import com.bonzaa.app.ui.theme.Sage
import com.bonzaa.app.ui.theme.Terracotta

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InsightsScreen(
    state: UiState,
    onOpenSymptom: (SymptomLog) -> Unit,
    onDismissAnalysis: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize()) {
        if (state.symptoms.isEmpty()) {
            EmptyState(
                emoji = "💚",
                title = "No incidents logged",
                message = "Hopefully it stays that way! If ${state.selectedPuppy?.name ?: "your puppy"} ever feels unwell, log a symptom with the + button and Bonzaa will analyze recent meals for likely culprits.",
            )
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(
                    start = 20.dp, end = 20.dp, top = 8.dp, bottom = 96.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                item {
                    Text(
                        "Tap an incident to see which foods were the likely cause.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(bottom = 4.dp),
                    )
                }
                items(state.symptoms, key = { it.id }) { symptom ->
                    SymptomCard(symptom = symptom, onClick = { onOpenSymptom(symptom) })
                }
            }
        }
    }

    val analysis = state.analysis
    if (analysis != null) {
        ModalBottomSheet(onDismissRequest = onDismissAnalysis) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 24.dp, end = 24.dp, bottom = 40.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text("🔍 Suspect foods", style = MaterialTheme.typography.headlineSmall)
                state.analysisFor?.let {
                    Text(
                        "${it.symptom.replaceFirstChar(Char::uppercase)} · onset ${it.onsetAt.take(16)}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (analysis.suspects.isEmpty()) {
                    Text(
                        "No meals were logged in the 2–48 hours before onset, so there is nothing to analyze. Keep logging every meal for better results.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                } else {
                    val maxScore = analysis.suspects.maxOf { it.score }.coerceAtLeast(0.01)
                    analysis.suspects.forEachIndexed { index, suspect ->
                        SuspectRow(rank = index + 1, suspect = suspect, fraction = (suspect.score / maxScore).toFloat())
                    }
                }
                Text(
                    "⚕️ ${analysis.note ?: "Correlation aid only — confirm with a veterinarian."}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun SymptomCard(symptom: SymptomLog, onClick: () -> Unit) {
    val severityColor = when (symptom.severity) {
        "severe" -> DangerRed
        "moderate" -> Terracotta
        else -> Sage
    }
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
            LetterAvatar(name = symptom.symptom, color = severityColor)
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    symptom.symptom.replaceFirstChar(Char::uppercase),
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    symptom.onsetAt.take(16),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            TagChip(
                text = (symptom.severity ?: "mild").uppercase(),
                bg = severityColor.copy(alpha = 0.15f),
                fg = severityColor,
            )
        }
    }
}

@Composable
private fun SuspectRow(rank: Int, suspect: Suspect, fraction: Float) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("#$rank", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
            Text(suspect.name, style = MaterialTheme.typography.titleMedium)
            if (suspect.wasNewFood) {
                TagChip("NEW FOOD", Honey.copy(alpha = 0.4f), MaterialTheme.colorScheme.onSurface)
            }
            Spacer(Modifier.weight(1f))
            Text(
                "%.1f".format(suspect.score),
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        // score bar
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(50)),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(fraction.coerceIn(0.04f, 1f))
                    .height(8.dp)
                    .background(
                        if (rank == 1) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondary,
                        RoundedCornerShape(50),
                    ),
            )
        }
        val details = buildList {
            suspect.brand?.takeIf { it.isNotBlank() }?.let { add(it) }
            add("${suspect.feedingsInWindow.size}× in window")
            if (suspect.precededPriorIncidents > 0) add("before ${suspect.precededPriorIncidents} earlier incident(s)")
            add("${suspect.fedTimesInLast14Days}× in last 14 days")
        }
        Text(
            details.joinToString(" · "),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
