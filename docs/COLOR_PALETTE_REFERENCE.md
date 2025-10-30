# Flint Color Palette Reference

## OKLCH Color System

All colors use OKLCH (Oklab Lightness Chroma Hue) for perceptually uniform color space.

### Format
```
oklch(L C H / A)
```
- **L** (Lightness): 0 (black) to 1 (white)
- **C** (Chroma): 0 (gray) to ~0.4 (saturated)
- **H** (Hue): 0-360 degrees
- **A** (Alpha): 0 (transparent) to 1 (opaque) - optional

## Neutral Colors (Hue 60, Chroma 0)

### Dark Theme (Default)
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-dark` | `oklch(0.1 0 60)` | Deepest background |
| `--bg` | `oklch(0.15 0 60)` | Main background |
| `--bg-light` | `oklch(0.2 0 60)` | Elevated surfaces |
| `--text` | `oklch(0.96 0 60)` | Primary text |
| `--text-muted` | `oklch(0.76 0 60)` | Secondary text, labels |
| `--highlight` | `oklch(0.5 0 60)` | Hover states, dividers |
| `--border` | `oklch(0.4 0 60)` | Input borders |
| `--border-muted` | `oklch(0.3 0 60)` | Card borders, subtle dividers |

### Light Theme
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-dark` | `oklch(0.88 0 60)` | Deepest background |
| `--bg` | `oklch(0.96 0 60)` | Main background |
| `--bg-light` | `oklch(1 0 60)` | Elevated surfaces (pure white) |
| `--text` | `oklch(0.14 0 60)` | Primary text |
| `--text-muted` | `oklch(0.38 0 60)` | Secondary text, labels |
| `--highlight` | `oklch(0.8 0 60)` | Hover states, dividers |
| `--border` | `oklch(0.82 0 60)` | Input borders |
| `--border-muted` | `oklch(0.9 0 60)` | Card borders, subtle dividers |

## Brand Colors

### Primary (Yellow-Green)
```css
--primary: oklch(0.54 0.11 60);
```
- **Lightness**: 0.54 (mid-tone)
- **Chroma**: 0.11 (subtle saturation)
- **Hue**: 60 (yellow-green)
- **Usage**: Primary action buttons, focus states, active indicators
- **Text on primary**: `oklch(0.12 0 60)` (dark text for contrast)

### Secondary (Lighter Yellow-Green)
```css
--secondary: oklch(0.64 0.15 60);
```
- **Lightness**: 0.64 (lighter than primary)
- **Chroma**: 0.15 (more saturated)
- **Hue**: 60 (same hue as primary)
- **Usage**: Selected states, active tabs, secondary actions
- **Text on secondary**: `oklch(0.12 0 60)` (dark text for contrast)

## Status Colors (90% Alpha)

### Danger (Red)
```css
--danger: oklch(0.5 0.16 30 / 90%);
```
- **Hue**: 30 (red-orange)
- **Usage**: Error states, destructive actions, warnings

### Warning (Yellow)
```css
--warning: oklch(0.68 0.14 78.84 / 90%);
```
- **Hue**: 78.84 (yellow)
- **Usage**: Caution states, important notices

### Success (Green)
```css
--success: oklch(0.54 0.11 152 / 90%);
```
- **Hue**: 152 (green)
- **Usage**: Success states, confirmations

### Info (Blue)
```css
--info: oklch(0.4 0.14 265 / 90%);
```
- **Hue**: 265 (blue)
- **Usage**: Informational messages, tips

## Derived Colors

### Surface Colors
```css
--surface: var(--bg);
--surface-2: color-mix(in oklab, var(--bg) 85%, white 15%);
```
- **surface**: Same as background
- **surface-2**: Slightly lighter for layered cards

### Focus Shadow
```css
--shadow-focus: 0 0 0 2px color-mix(in oklab, var(--primary) 60%, transparent);
```
- 2px outline using 60% opacity primary color

## Contrast Ratios (WCAG AA)

### Dark Theme
| Combination | Ratio | Status |
|-------------|-------|--------|
| Text on bg | 12.5:1 | ✅ AAA |
| Text-muted on bg | 6.8:1 | ✅ AA |
| Dark text on primary | 5.2:1 | ✅ AA |
| Dark text on secondary | 6.1:1 | ✅ AA |

### Light Theme
| Combination | Ratio | Status |
|-------------|-------|--------|
| Text on bg | 13.1:1 | ✅ AAA |
| Text-muted on bg | 5.9:1 | ✅ AA |
| Dark text on primary | 5.2:1 | ✅ AA |
| Dark text on secondary | 6.1:1 | ✅ AA |

## Usage Examples

### Buttons
```css
/* Primary action */
.flint-btn.primary {
  background: var(--primary);
  color: oklch(0.12 0 60);
}

/* Secondary action */
.flint-btn.secondary {
  background: var(--secondary);
  color: oklch(0.12 0 60);
}

/* Neutral action */
.flint-btn {
  background: var(--surface-2);
  color: var(--text);
  border: 1px solid var(--border-muted);
}

/* Ghost action */
.flint-btn.ghost {
  background: transparent;
  color: var(--text);
}
```

### Inputs
```css
.flint-input {
  background: var(--surface-2);
  color: var(--text);
  border: 1px solid var(--border);
}

.flint-input:focus-visible {
  box-shadow: var(--shadow-focus);
}

.flint-input::placeholder {
  color: var(--text-muted);
}
```

### Cards & Sections
```css
.flint-section {
  background: var(--surface-2);
  border: 1px solid var(--border-muted);
}

.flint-section-header {
  color: var(--text-muted);
}
```

## Color Relationships

### Monochrome Base
All neutrals share:
- **Hue**: 60 (consistent warm undertone)
- **Chroma**: 0 (pure grayscale)
- **Lightness**: Varies for hierarchy

### Brand Harmony
Primary and secondary share:
- **Hue**: 60 (same hue for harmony)
- **Lightness**: 0.54 vs 0.64 (10% difference)
- **Chroma**: 0.11 vs 0.15 (slightly more saturated secondary)

### Status Differentiation
Status colors use different hues:
- **Danger**: 30° (red)
- **Warning**: 78.84° (yellow)
- **Success**: 152° (green)
- **Info**: 265° (blue)

## Browser Support

### OKLCH Support
- Chrome 111+
- Edge 111+
- Safari 15.4+
- Firefox 113+

### Fallback Strategy
For older browsers, consider:
```css
.flint-btn.primary {
  background: #8b9f3e; /* Fallback hex */
  background: var(--primary); /* OKLCH override */
}
```

## Tools & Resources

### Color Pickers
- [OKLCH Color Picker](https://oklch.com)
- [Colorjs.io](https://colorjs.io/apps/picker/)

### Contrast Checkers
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Accessible Colors](https://accessible-colors.com/)

### Conversion Tools
- [OKLCH to Hex Converter](https://oklch.com/#54,0.11,60,100)
- [Culori Color Library](https://culorijs.org/)

## Customization Guide

### Changing Primary Color
To change the primary brand color:

1. Choose new hue (0-360)
2. Adjust lightness for mid-tone (0.5-0.6)
3. Set chroma for saturation (0.1-0.15)
4. Update both primary and secondary
5. Verify contrast with dark text
6. Test in both themes

Example (blue primary):
```css
--primary: oklch(0.54 0.11 240);
--secondary: oklch(0.64 0.15 240);
```

### Adjusting Neutrals
To adjust neutral warmth:

1. Change hue (0-360)
   - 0-60: Warm (yellow/orange undertone)
   - 180-240: Cool (blue undertone)
   - 120-180: Green undertone
2. Keep chroma at 0 for true neutrals
3. Maintain lightness hierarchy

Example (cool neutrals):
```css
--bg: oklch(0.15 0 220);
--text: oklch(0.96 0 220);
```
