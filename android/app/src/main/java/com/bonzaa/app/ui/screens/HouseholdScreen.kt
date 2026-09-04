package com.bonzaa.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.bonzaa.app.data.Household
import com.bonzaa.app.data.HouseholdMember
import com.bonzaa.app.ui.LocalLang

/**
 * Shown after sign-in when the account belongs to no family yet — every data
 * route 409s with no_household until one exists, so this is the only door
 * into the rest of the app past that point.
 */
@Composable
fun HouseholdGateScreen(
    langCode: String,
    onToggleLang: () -> Unit,
    onCreate: (name: String) -> Unit,
    onJoin: (code: String) -> Unit,
    busy: Boolean,
    error: String?,
) {
    val lang = LocalLang.current
    var mode by remember { mutableStateOf("create") } // "create" | "join"
    var name by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("👨‍👩‍👧", style = MaterialTheme.typography.displaySmall)
        Spacer(Modifier.height(8.dp))
        Text("Bonzaa", style = MaterialTheme.typography.headlineLarge)
        Spacer(Modifier.height(6.dp))
        Text(
            lang["hh_tagline"],
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )

        Spacer(Modifier.height(40.dp))

        Text(
            if (mode == "create") lang["hh_create_title"] else lang["hh_join_title"],
            style = MaterialTheme.typography.titleMedium,
        )
        Spacer(Modifier.height(16.dp))

        if (busy) {
            CircularProgressIndicator()
        } else if (mode == "create") {
            OutlinedTextField(
                value = name, onValueChange = { name = it },
                label = { Text(lang["hh_name"]) },
                modifier = Modifier.fillMaxWidth(), singleLine = true,
            )
            Spacer(Modifier.height(14.dp))
            Button(
                onClick = { onCreate(name.trim()) },
                enabled = name.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) { Text(lang["hh_create_btn"]) }
        } else {
            OutlinedTextField(
                value = code, onValueChange = { code = it.uppercase() },
                label = { Text(lang["hh_code"]) },
                modifier = Modifier.fillMaxWidth(), singleLine = true,
            )
            Spacer(Modifier.height(14.dp))
            Button(
                onClick = { onJoin(code.trim()) },
                enabled = code.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) { Text(lang["hh_join_btn"]) }
        }

        error?.let {
            Spacer(Modifier.height(14.dp))
            Text(
                it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                textAlign = TextAlign.Center,
            )
        }

        Spacer(Modifier.height(20.dp))
        TextButton(onClick = { mode = if (mode == "create") "join" else "create" }) {
            Text(if (mode == "create") lang["hh_to_join"] else lang["hh_to_create"])
        }

        Spacer(Modifier.height(12.dp))
        OutlinedButton(onClick = onToggleLang) {
            Text(if (langCode == "en") "தமிழ்" else "English")
        }
    }
}

/** Invite code + roster, reached from the top bar once inside the app. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FamilySheet(
    household: Household,
    members: List<HouseholdMember>,
    yourUserId: String?,
    onDismiss: () -> Unit,
    onRemoveMember: (userId: String) -> Unit,
    onLeave: () -> Unit,
) {
    val lang = LocalLang.current
    val clipboard = LocalClipboardManager.current
    var copied by remember { mutableStateOf(false) }
    var confirmRemove by remember { mutableStateOf<HouseholdMember?>(null) }
    var confirmLeave by remember { mutableStateOf(false) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 24.dp, end = 24.dp, bottom = 40.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(lang["hh_panel_title"], style = MaterialTheme.typography.headlineSmall)
            Text(household.name, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)

            Spacer(Modifier.height(6.dp))
            Text(lang["hh_invite_label"], style = MaterialTheme.typography.labelLarge)
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(
                    household.inviteCode,
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.ExtraBold),
                    modifier = Modifier.weight(1f),
                )
                OutlinedButton(onClick = {
                    clipboard.setText(AnnotatedString(household.inviteCode))
                    copied = true
                }) { Text(if (copied) lang["hh_copied"] else lang["hh_copy"]) }
            }

            Spacer(Modifier.height(10.dp))
            Text(lang["hh_members"], style = MaterialTheme.typography.labelLarge)
            Column {
                members.forEach { m ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column {
                            Text(
                                (m.displayName?.takeIf { it.isNotBlank() } ?: m.email ?: m.userId) +
                                    if (m.userId == yourUserId) " · ${lang["hh_you"]}" else "",
                                style = MaterialTheme.typography.bodyLarge,
                            )
                            if (m.role == "head") {
                                Text(
                                    lang["hh_head"],
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        if (household.isHead && m.role != "head") {
                            TextButton(onClick = { confirmRemove = m }) { Text(lang["hh_remove"]) }
                        }
                    }
                    HorizontalDivider()
                }
            }

            Spacer(Modifier.height(10.dp))
            OutlinedButton(onClick = { confirmLeave = true }, modifier = Modifier.fillMaxWidth()) {
                Text(lang["hh_leave"])
            }
        }
    }

    confirmRemove?.let { m ->
        AlertDialog(
            onDismissRequest = { confirmRemove = null },
            title = { Text(lang.fmt("hh_remove_q", m.displayName?.takeIf { it.isNotBlank() } ?: m.email ?: m.userId)) },
            confirmButton = {
                TextButton(onClick = { onRemoveMember(m.userId); confirmRemove = null }) { Text(lang["hh_remove"]) }
            },
            dismissButton = { TextButton(onClick = { confirmRemove = null }) { Text(lang["cancel"]) } },
        )
    }

    if (confirmLeave) {
        AlertDialog(
            onDismissRequest = { confirmLeave = false },
            title = { Text(lang["hh_leave_q"]) },
            text = { Text(lang["hh_leave_msg"]) },
            confirmButton = {
                TextButton(onClick = { confirmLeave = false; onLeave() }) { Text(lang["hh_leave"]) }
            },
            dismissButton = { TextButton(onClick = { confirmLeave = false }) { Text(lang["cancel"]) } },
        )
    }
}
