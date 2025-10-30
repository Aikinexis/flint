# Gestalt Law of Similarity - Implementation Guide

## Principle
The Gestalt law of similarity states that elements that share visual characteristics are perceived as related or belonging to the same group.

## Implementation in Flint

### 1. Color Similarity

#### Primary Actions (Related)
All primary actions share the same color:
- **Voice Record button**: `background: var(--primary)`
- **Rewrite button**: `background: var(--primary)`
- **Summarize button**: `background: var(--primary)`
- **MiniBar icons**: All use `flint-icon-btn primary`

#### Secondary Actions (Related)
All secondary/cancel actions share neutral styling:
- **Clear buttons**: `flint-btn ghost`
- **Cancel buttons**: `flint-btn ghost`
- **Discard buttons**: `flint-btn ghost`

#### Selection States (Related)
All selected/active states use secondary color:
- **Active tab**: `flint-btn secondary`
- **Selected tone**: `flint-btn secondary`
- **Selected mode**: `flint-btn secondary`

### 2. Shape Similarity

#### Button Groups
All buttons in the same functional group share the same shape:
- **Border radius**: `var(--radius-md)` (16px) for all action buttons
- **Icon buttons**: Square (38x38px) with same radius
- **Input fields**: All use `var(--radius-md)` (16px)

#### Containers
Related content containers share shape:
- **Sections**: `flint-section` with `var(--radius-md)`
- **Cards**: `flint-card` with `var(--radius-md)`
- **MiniBar**: `var(--radius-lg)` (24px) for floating UI

### 3. Size Similarity

#### Button Heights
All action buttons share the same height:
- **Standard buttons**: `var(--btn-height)` (38px)
- **Icon buttons**: 38x38px square
- **Toolbar height**: `var(--toolbar-height)` (44px)

#### Icon Sizes
Icons are consistent within their context:
- **Button icons**: 16x16px
- **MiniBar icons**: 18x18px (slightly larger for floating context)
- **Stroke width**: Consistent 2px for outlined icons

#### Typography
Related text elements share font sizes:
- **Section headers**: `var(--fs-sm)` (13px)
- **Body text**: `var(--fs-md)` (14px)
- **Button labels**: `var(--fs-md)` (14px)

### 4. Spacing Similarity

#### Button Groups
Related buttons share consistent spacing:
- **Gap between buttons**: 8px (`.flint-action-group { gap: 8px }`)
- **Button padding**: 0 16px (horizontal)
- **Section padding**: 16px (all sides)

#### Vertical Rhythm
Consistent spacing between related elements:
- **Between sections**: 16px margin-top
- **Within sections**: 12px margin-bottom for headers
- **Input spacing**: 12px between label and input

### 5. Alignment Similarity

#### Horizontal Alignment
Related controls align on common grid:
- **Button groups**: Left-aligned within container
- **Labels**: Left-aligned above inputs
- **Actions**: Consistent left alignment

#### Vertical Alignment
Elements in same row share vertical center:
- **Toolbar tabs**: All vertically centered
- **Button groups**: `align-items: center`
- **Settings rows**: Label and control vertically centered

## Visual Grouping Examples

### Voice Section
```
┌─────────────────────────────────────┐
│ Voice to text                       │ ← Section header (muted, small)
│                                     │
│ [●Record] [Clear]                   │ ← Primary + Ghost (different groups)
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Transcript area...              │ │ ← Input (same radius as buttons)
│ └─────────────────────────────────┘ │
│                                     │
│ [Insert at cursor] [Copy]           │ ← Secondary actions (same style)
└─────────────────────────────────────┘
```

### Rewrite Section
```
┌─────────────────────────────────────┐
│ Rewrite text                        │ ← Section header
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Input text...                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Tone                                │ ← Label (muted)
│ [Formal] [Casual] [Concise] [Expand]│ ← All same size/shape/spacing
│                                     │
│ [Rewrite] [Cancel]                  │ ← Primary + Ghost (different)
└─────────────────────────────────────┘
```

### MiniBar
```
┌─────────────────────┐
│ [●] [≡] [→]         │ ← All same size, color, spacing
└─────────────────────┘
   ↑    ↑    ↑
   All 38x38px, primary color, 8px gap
```

## Differentiation Strategy

### How Unrelated Actions Look Different

1. **Primary vs Secondary Actions**
   - Primary: Colored background (`var(--primary)`)
   - Secondary: Neutral background (`var(--surface-2)`)
   - Ghost: Transparent background

2. **Destructive Actions**
   - Use `var(--danger)` color
   - Same shape/size but different color signals different purpose

3. **Status Indicators**
   - Badges use smaller size (12px font)
   - Rounded pill shape (999px radius)
   - Status colors (danger, warning, success, info)

4. **Input vs Output**
   - Inputs: Editable, lighter background
   - Outputs: Read-only, separated by border-top
   - Same shape but different context

## Consistency Rules

### DO
✅ Use same height for all buttons in a group
✅ Use same gap (8px) between related buttons
✅ Use same radius for all buttons in a section
✅ Use same icon size within a context
✅ Align related controls to common grid
✅ Use primary color for all primary actions
✅ Use ghost style for all cancel/clear actions

### DON'T
❌ Mix different button heights in same group
❌ Use different gaps between similar buttons
❌ Use different radii for related elements
❌ Mix icon sizes within same context
❌ Misalign related controls
❌ Use primary color for destructive actions
❌ Use different styles for same action type

## Testing Similarity

### Visual Checklist
- [ ] All primary action buttons have same height
- [ ] All buttons in a group have same radius
- [ ] All icons in a context have same size
- [ ] All gaps between related buttons are equal
- [ ] All section headers use same font size and color
- [ ] All inputs have same border and radius
- [ ] All similar actions use same color
- [ ] All cancel/clear actions look the same

### Code Checklist
- [ ] No hardcoded colors (use CSS variables)
- [ ] No hardcoded sizes (use token variables)
- [ ] Consistent class names (`.flint-btn`, `.flint-action-group`)
- [ ] Consistent spacing utilities (`gap: 8px`)
- [ ] Consistent border radius (`var(--radius-md)`)
