# Measurement Units Feature

## Overview

Flint now supports automatic detection and configuration of measurement units (metric vs imperial) to ensure the AI generates content with the appropriate units for your location.

## Features

### Automatic Detection

On first launch, Flint automatically detects your location based on your browser's locale settings and sets the appropriate measurement unit system:

- **Imperial**: United States, Liberia, Myanmar (miles, pounds, Fahrenheit, gallons)
- **Metric**: All other countries (kilometers, kilograms, Celsius, liters)

### Manual Configuration

You can override the automatic detection in Settings:

1. Open the side panel
2. Navigate to Settings
3. Expand the "Measurements" section
4. Select your preferred unit system:
   - **Metric**: km, kg, °C, L
   - **Imperial**: mi, lb, °F, gal

### AI Integration

The measurement unit preference is automatically included in all AI operations:

- **Generate**: New content uses your preferred units
- **Rewrite**: Maintains consistency with your unit preference
- **Summarize**: Summaries use your preferred units
- **Continue Writing**: Continues with your preferred units

## Technical Details

### Location Detection

The system detects your country code from the browser's `navigator.language` property (e.g., "en-US" → "US").

### Context Injection

The measurement unit preference is injected into AI prompts as context:
- Metric: "Use metric units (kilometers, kilograms, Celsius, liters) for all measurements."
- Imperial: "Use imperial units (miles, pounds, Fahrenheit, gallons) for all measurements."

### Storage

The preference is stored in `chrome.storage.local` and persists across sessions.

## API Reference

### Location Utilities (`src/utils/location.ts`)

```typescript
// Detect country code from browser locale
detectCountryCode(): string | null

// Detect appropriate measurement unit
detectMeasurementUnit(): MeasurementUnit

// Format a measurement with appropriate unit
formatMeasurement(
  value: number,
  type: 'distance' | 'weight' | 'temperature' | 'volume',
  unit: MeasurementUnit
): string

// Convert between metric and imperial
convertMeasurement(
  value: number,
  type: 'distance' | 'weight' | 'temperature' | 'volume',
  from: MeasurementUnit,
  to: MeasurementUnit
): number
```

### Storage Service

```typescript
// Settings interface includes measurementUnit
interface Settings {
  measurementUnit?: MeasurementUnit; // 'metric' | 'imperial'
  // ... other settings
}
```

### AI Service

```typescript
// Automatically includes measurement context in all operations
static async getMeasurementUnitContext(): Promise<string>
```

## Examples

### Example 1: Recipe Generation

**User prompt**: "Write a recipe for chocolate chip cookies"

**With Metric**:
- "Preheat oven to 180°C"
- "Add 250g of flour"
- "Bake for 12 minutes"

**With Imperial**:
- "Preheat oven to 350°F"
- "Add 2 cups of flour"
- "Bake for 12 minutes"

### Example 2: Travel Content

**User prompt**: "Describe a road trip from San Francisco to Los Angeles"

**With Metric**:
- "The 615 km journey takes about 6 hours"
- "Average speed: 100 km/h"

**With Imperial**:
- "The 382 mile journey takes about 6 hours"
- "Average speed: 65 mph"

## Privacy

Location detection is performed entirely locally using browser APIs. No data is sent to external servers.
