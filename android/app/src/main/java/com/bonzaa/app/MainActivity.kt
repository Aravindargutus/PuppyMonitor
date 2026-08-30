package com.bonzaa.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Pets
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.lifecycle.viewmodel.compose.viewModel
import com.bonzaa.app.ui.screens.AddFoodSheet
import com.bonzaa.app.ui.screens.AddMealSheet
import com.bonzaa.app.ui.screens.AddPuppySheet
import com.bonzaa.app.ui.screens.FoodsScreen
import com.bonzaa.app.ui.screens.InsightsScreen
import com.bonzaa.app.ui.screens.LogSymptomSheet
import com.bonzaa.app.ui.screens.PuppiesScreen
import com.bonzaa.app.ui.screens.TodayScreen
import com.bonzaa.app.ui.theme.BonzaaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            BonzaaTheme {
                BonzaaApp()
            }
        }
    }
}

private enum class Tab(val label: String, val icon: ImageVector) {
    Today("Today", Icons.Default.Home),
    Foods("Foods", Icons.Default.Restaurant),
    Insights("Insights", Icons.Default.Favorite),
    Puppies("Puppies", Icons.Default.Pets),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BonzaaApp(vm: AppViewModel = viewModel()) {
    val state by vm.state.collectAsState()
    var tab by remember { mutableStateOf(Tab.Today) }
    var showAddMeal by remember { mutableStateOf(false) }
    var showAddFood by remember { mutableStateOf(false) }
    var showAddPuppy by remember { mutableStateOf(false) }
    var showLogSymptom by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(state.error) {
        state.error?.let {
            snackbar.showSnackbar(it)
            vm.clearError()
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("🐾 Bonzaa", style = MaterialTheme.typography.headlineSmall)
                        val sub = when (tab) {
                            Tab.Today -> state.selectedPuppy?.let { "${it.name}'s meals" } ?: "Daily meals"
                            Tab.Foods -> "Food catalog"
                            Tab.Insights -> state.selectedPuppy?.let { "${it.name}'s health" } ?: "Health incidents"
                            Tab.Puppies -> "Your pack"
                        }
                        Text(
                            sub,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                ),
            )
        },
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                Tab.entries.forEach { t ->
                    NavigationBarItem(
                        selected = tab == t,
                        onClick = {
                            tab = t
                            if (t == Tab.Insights) vm.refreshSymptoms()
                        },
                        icon = { Icon(t.icon, contentDescription = t.label) },
                        label = { Text(t.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.primary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                        ),
                    )
                }
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    when (tab) {
                        Tab.Today -> if (state.selectedPuppyId != null) showAddMeal = true else showAddPuppy = true
                        Tab.Foods -> showAddFood = true
                        Tab.Insights -> if (state.selectedPuppyId != null) showLogSymptom = true else showAddPuppy = true
                        Tab.Puppies -> showAddPuppy = true
                    }
                },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add")
            }
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            if (state.loading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }
            when (tab) {
                Tab.Today -> TodayScreen(
                    state = state,
                    onSelectPuppy = vm::selectPuppy,
                    onSelectDate = vm::selectDate,
                    onDeleteFeeding = vm::deleteFeeding,
                )
                Tab.Foods -> FoodsScreen(state = state)
                Tab.Insights -> InsightsScreen(
                    state = state,
                    onOpenSymptom = vm::loadSuspectsFor,
                    onDismissAnalysis = vm::dismissAnalysis,
                )
                Tab.Puppies -> PuppiesScreen(state = state, onDelete = vm::deletePuppy)
            }
        }
    }

    if (showAddMeal) {
        AddMealSheet(
            foods = state.foods,
            onDismiss = { showAddMeal = false },
            onSave = { foodId, qty, unit, slot, time, fedBy, isNew ->
                vm.addFeeding(foodId, qty, unit, slot, time, fedBy, isNew)
                showAddMeal = false
            },
        )
    }
    if (showAddFood) {
        AddFoodSheet(
            onDismiss = { showAddFood = false },
            onSave = { name, brand, type ->
                vm.addFood(name, brand, type)
                showAddFood = false
            },
        )
    }
    if (showAddPuppy) {
        AddPuppySheet(
            onDismiss = { showAddPuppy = false },
            onSave = { name, breed, birthDate ->
                vm.addPuppy(name, breed, birthDate)
                showAddPuppy = false
            },
        )
    }
    if (showLogSymptom) {
        LogSymptomSheet(
            puppyName = state.selectedPuppy?.name ?: "your puppy",
            onDismiss = { showLogSymptom = false },
            onSave = { symptom, severity, onsetAt, notes ->
                vm.logSymptom(symptom, severity, onsetAt, notes)
                showLogSymptom = false
            },
        )
    }
}
