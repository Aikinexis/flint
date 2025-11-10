/**
 * Location detection utility for determining measurement unit preferences
 */

import type { MeasurementUnit } from '../services/storage';

/**
 * Countries that primarily use imperial measurements
 */
const IMPERIAL_COUNTRIES = ['US', 'LR', 'MM']; // United States, Liberia, Myanmar

/**
 * Detects the user's country code from browser locale
 * @returns Two-letter country code or null if not detected
 */
export function detectCountryCode(): string | null {
  try {
    // Try to get country from locale (e.g., "en-US" -> "US")
    const locale = navigator.language || navigator.languages?.[0];
    if (!locale) return null;

    // Extract country code from locale (format: language-COUNTRY)
    const parts = locale.split('-');
    if (parts.length > 1) {
      return parts[1]?.toUpperCase() || null;
    }

    return null;
  } catch (error) {
    console.error('[Location] Failed to detect country code:', error);
    return null;
  }
}

/**
 * Detects the appropriate measurement unit based on user's location
 * @returns 'imperial' for US/Liberia/Myanmar, 'metric' for all others
 */
export function detectMeasurementUnit(): MeasurementUnit {
  const countryCode = detectCountryCode();

  if (countryCode && IMPERIAL_COUNTRIES.includes(countryCode)) {
    return 'imperial';
  }

  // Default to metric for all other countries
  return 'metric';
}

/**
 * Formats a measurement value with the appropriate unit
 * @param value - Numeric value to format
 * @param type - Type of measurement (distance, weight, temperature, volume)
 * @param unit - Measurement unit system
 * @returns Formatted string with value and unit
 */
export function formatMeasurement(
  value: number,
  type: 'distance' | 'weight' | 'temperature' | 'volume',
  unit: MeasurementUnit
): string {
  const units = {
    metric: {
      distance: 'km',
      weight: 'kg',
      temperature: '°C',
      volume: 'L',
    },
    imperial: {
      distance: 'mi',
      weight: 'lb',
      temperature: '°F',
      volume: 'gal',
    },
  };

  return `${value} ${units[unit][type]}`;
}

/**
 * Converts between metric and imperial units
 * @param value - Value to convert
 * @param type - Type of measurement
 * @param from - Source unit system
 * @param to - Target unit system
 * @returns Converted value
 */
export function convertMeasurement(
  value: number,
  type: 'distance' | 'weight' | 'temperature' | 'volume',
  from: MeasurementUnit,
  to: MeasurementUnit
): number {
  if (from === to) return value;

  const conversions = {
    distance: {
      metricToImperial: (v: number) => v * 0.621371, // km to miles
      imperialToMetric: (v: number) => v * 1.60934, // miles to km
    },
    weight: {
      metricToImperial: (v: number) => v * 2.20462, // kg to pounds
      imperialToMetric: (v: number) => v * 0.453592, // pounds to kg
    },
    temperature: {
      metricToImperial: (v: number) => (v * 9) / 5 + 32, // Celsius to Fahrenheit
      imperialToMetric: (v: number) => ((v - 32) * 5) / 9, // Fahrenheit to Celsius
    },
    volume: {
      metricToImperial: (v: number) => v * 0.264172, // liters to gallons
      imperialToMetric: (v: number) => v * 3.78541, // gallons to liters
    },
  };

  const converter = from === 'metric' ? 'metricToImperial' : 'imperialToMetric';
  return conversions[type][converter](value);
}
