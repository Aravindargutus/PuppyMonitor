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
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.bonzaa.app.UiState
import com.bonzaa.app.data.Suspect
import com.bonzaa.app.data.SuspectAnalysis
import com.bonzaa.app.data.SymptomLog
import com.bonzaa.app.ui.Lang
import com.bonzaa.app.ui.theme.DangerRed
import com.bonzaa.app.ui.theme.Honey
import com.bonzaa.app.ui.theme.Sage
import com.bonzaa.app.ui.theme.Terracotta

/**
 * Plain-text version of the same analysis, for handing to a vet — WhatsApp,
 * SMS, email, or just read off the screen. Kept in the app's current
 * language so it matches what the family already sees on screen.
 */
private fun buildVetSummary(lang: Lang, puppyName: String, symptom: SymptomLog, analysis: SuspectAnalysis): String {
    val lines = mutableListOf(
        "🐾 Bonzaa — ${lang["vet_share_title"]}",
        lang.fmt("vet_share_for", puppyName),
        "",
        "${lang.sym(symptom.symptom).replaceFirstChar(Char::uppercase)} (${lang[symptom.severity ?: "mild"]}) · ${lang["onset_at"]} ${symptom.onsetAt.take(16)}",
        "",
    )
    if (analysis.suspects.isEmpty()) {
        lines += lang["no_window_meals"]
    } else {
        lines += "${lang["suspects_title"]}:"
        analysis.suspects.forEachIndexed { i, s ->
            val bits = listOfNotNull(
                s.brand?.takeIf { it.isNotBlank() },
                lang.fmt("in_window", s.feedingsInWindow.size),
                if (s.precededPriorIncidents > 0) lang.fmt("before_incidents", s.precededPriorIncidents) else null,
                lang.fmt("last14", s.fedTimesInLast14Days),
            ).joinToString(" · ")
            lines += "${i + 1}. ${s.name}${if (s.wasNewFood) " [${lang["new_food_badge"]}]" else ""} — %.1f".format(s.score)
            lines += "   $bits"
        }
    }
    lines += ""
    lines += "⚕️ ${lang["vet_note"]}"
    return lines.joinToString("\n")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InsightsScreen(
    state: UiState,
    onOpenSymptom: (SymptomLog) -> Unit,
    onDismissAnalysis: () -> Unit,
) {
    val lang = com.bonzaa.app.ui.LocalLang.current
    Column(modifier = Modifier.fillMaxSize()) {
        if (state.symptoms.isEmpty()) {
            EmptyState(
                emoji = "💚",
                title = lang["no_incidents_title"],
                message = lang.fmt("no_incidents_msg", state.selectedPuppy?.name ?: lang["your_puppy"]),
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
                        lang["insights_hint"],
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
        val context = LocalContext.current
        ModalBottomSheet(onDismissRequest = onDismissAnalysis) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 24.dp, end = 24.dp, bottom = 40.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(lang["suspects_title"], style = MaterialTheme.typography.headlineSmall)
                state.analysisFor?.let {
                    Text(
                        "${lang.sym(it.symptom).replaceFirstChar(Char::uppercase)} · ${lang["onset_at"]} ${it.onsetAt.take(16)}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (analysis.suspects.isEmpty()) {
                    Text(
                        lang["no_window_meals"],
                        style = MaterialTheme.typography.bodyMedium,
                    )
                } else {
                    val maxScore = analysis.suspects.maxOf { it.score }.coerceAtLeast(0.01)
                    analysis.suspects.forEachIndexed { index, suspect ->
                        SuspectRow(rank = index + 1, suspect = suspect, fraction = (suspect.score / maxScore).toFloat())
                    }
                }
                Text(
                    "⚕️ ${lang["vet_note"]}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                state.analysisFor?.let { symptom ->
                    Button(
                        onClick = {
                            val puppyName = state.selectedPuppy?.name ?: lang["your_puppy"]
                            val text = buildVetSummary(lang, puppyName, symptom, analysis)
                            val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(android.content.Intent.EXTRA_TEXT, text)
                            }
                            context.startActivity(android.content.Intent.createChooser(intent, lang["share_vet"]))
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text(lang["share_vet"]) }
                }
            }
        }
    }
}

@Composable
private fun SymptomCard(symptom: SymptomLog, onClick: () -> Unit) {
    val lang = com.bonzaa.app.ui.LocalLang.current
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
            LetterAvatar(name = lang.sym(symptom.symptom), color = severityColor)
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    lang.sym(symptom.symptom).replaceFirstChar(Char::uppercase),
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    symptom.onsetAt.take(16),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            TagChip(
                text = lang[symptom.severity ?: "mild"].uppercase(),
                bg = severityColor.copy(alpha = 0.15f),
                fg = severityColor,
            )
        }
    }
}

@Composable
private fun SuspectRow(rank: Int, suspect: Suspect, fraction: Float) {
    val lang = com.bonzaa.app.ui.LocalLang.current
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("#$rank", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
            Text(suspect.name, style = MaterialTheme.typography.titleMedium)
            if (suspect.wasNewFood) {
                TagChip(lang["new_food_badge"], Honey.copy(alpha = 0.4f), MaterialTheme.colorScheme.onSurface)
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
            add(lang.fmt("in_window", suspect.feedingsInWindow.size))
            if (suspect.precededPriorIncidents > 0) add(lang.fmt("before_incidents", suspect.precededPriorIncidents))
            add(lang.fmt("last14", suspect.fedTimesInLast14Days))
        }
        Text(
            details.joinToString(" · "),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
