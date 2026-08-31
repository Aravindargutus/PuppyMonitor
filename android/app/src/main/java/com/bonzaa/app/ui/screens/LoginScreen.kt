package com.bonzaa.app.ui.screens

import android.app.Activity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.bonzaa.app.data.CatalystAuth
import com.bonzaa.app.ui.LocalLang

@Composable
fun LoginScreen(
    langCode: String,
    onToggleLang: () -> Unit,
    onSignedIn: () -> Unit,
) {
    val lang = LocalLang.current
    val context = LocalContext.current
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("🐾", style = MaterialTheme.typography.displaySmall)
        Spacer(Modifier.height(8.dp))
        Text("Bonzaa", style = MaterialTheme.typography.headlineLarge)
        Spacer(Modifier.height(6.dp))
        Text(
            lang["auth_tagline"],
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )

        Spacer(Modifier.height(40.dp))

        Text(lang["auth_signin"], style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(6.dp))
        Text(
            lang["auth_hint"],
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )

        Spacer(Modifier.height(24.dp))

        if (busy) {
            CircularProgressIndicator()
            Spacer(Modifier.height(12.dp))
            Text(lang["auth_signing_in"], style = MaterialTheme.typography.bodySmall)
        } else {
            Button(
                onClick = {
                    val activity = context as? Activity ?: return@Button
                    busy = true
                    error = null
                    CatalystAuth.login(activity) { ok, message ->
                        busy = false
                        if (ok) onSignedIn() else error = message ?: lang["auth_failed"]
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text(lang["auth_signin_btn"]) }
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

        Spacer(Modifier.height(32.dp))
        OutlinedButton(onClick = onToggleLang) {
            Text(if (langCode == "en") "தமிழ்" else "English")
        }
    }
}
