package com.bonzaa.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Warm "puppy" palette — terracotta, sage, honey on cream.
val Terracotta = Color(0xFFE07A5F)
val TerracottaDeep = Color(0xFFC85A3F)
val Sage = Color(0xFF81B29A)
val SageDeep = Color(0xFF5E9078)
val Honey = Color(0xFFF2CC8F)
val Cream = Color(0xFFFDF6EE)
val CreamCard = Color(0xFFFFFFFF)
val Ink = Color(0xFF3D3230)
val InkSoft = Color(0xFF7A6E6A)
val Blush = Color(0xFFFBE8E0)
val Mist = Color(0xFFE9F1EC)
val DangerRed = Color(0xFFC24040)

private val LightColors = lightColorScheme(
    primary = Terracotta,
    onPrimary = Color.White,
    primaryContainer = Blush,
    onPrimaryContainer = TerracottaDeep,
    secondary = Sage,
    onSecondary = Color.White,
    secondaryContainer = Mist,
    onSecondaryContainer = SageDeep,
    tertiary = Honey,
    onTertiary = Ink,
    background = Cream,
    onBackground = Ink,
    surface = CreamCard,
    onSurface = Ink,
    surfaceVariant = Color(0xFFF6EDE4),
    onSurfaceVariant = InkSoft,
    outline = Color(0xFFD8CCC4),
    error = DangerRed,
    onError = Color.White,
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFEF9B84),
    onPrimary = Color(0xFF3D1A10),
    primaryContainer = Color(0xFF5C3227),
    onPrimaryContainer = Color(0xFFFFDACF),
    secondary = Color(0xFF9CCBB4),
    onSecondary = Color(0xFF153226),
    secondaryContainer = Color(0xFF335445),
    onSecondaryContainer = Color(0xFFD3EDE0),
    tertiary = Color(0xFFF2CC8F),
    onTertiary = Color(0xFF3D2F10),
    background = Color(0xFF201A18),
    onBackground = Color(0xFFF0E6E1),
    surface = Color(0xFF2A2320),
    onSurface = Color(0xFFF0E6E1),
    surfaceVariant = Color(0xFF352D29),
    onSurfaceVariant = Color(0xFFBCAAA2),
    outline = Color(0xFF5C504A),
    error = Color(0xFFF2B8B5),
    onError = Color(0xFF601410),
)

val BonzaaShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(18.dp),
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(32.dp),
)

val BonzaaTypography = Typography().let { base ->
    base.copy(
        headlineMedium = base.headlineMedium.copy(fontWeight = FontWeight.Bold, letterSpacing = (-0.5).sp),
        headlineSmall = base.headlineSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = (-0.3).sp),
        titleLarge = base.titleLarge.copy(fontWeight = FontWeight.SemiBold),
        titleMedium = base.titleMedium.copy(fontWeight = FontWeight.SemiBold),
        labelLarge = base.labelLarge.copy(fontWeight = FontWeight.SemiBold),
    )
}

@Composable
fun BonzaaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        shapes = BonzaaShapes,
        typography = BonzaaTypography,
        content = content,
    )
}
