# Carousel Layout Design

## Visual Structure

```
┌─────────────────────────────────────────────┐
│  Panel Header: "Rewrite text"              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │                                       │ │
│  │   Always-editable textarea            │ │
│  │   (transparent background)            │ │
│  │   User can type/paste directly        │ │
│  │                                       │ │
│  │   [Loading spinner overlay if active] │ │
│  │                                       │ │
│  ├───────────────────────────────────────┤ │
│  │  [<]  • • ● • •  [>]  [♥] [🗑]       │ │
│  │   ^    ^  ^  ^    ^    ^    ^        │ │
│  │  Left  Dots    Right Like Delete     │ │
│  └───────────────────────────────────────┘ │
│                                             │
├─────────────────────────────────────────────┤
│  [Rewrite Button]  [Clear]                 │
│  [Style Dropdown]                          │
│  [Custom Prompt Textarea]                  │
│  [Error/Success Messages]                  │
└─────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Transparent Background
- No grey `var(--surface-2)` background
- Clean, minimal look
- Focus on content, not container

### 2. Always-Editable Text
- No edit button needed
- No edit/view mode toggle
- Direct manipulation - just click and type
- Changes save automatically via `onEdit` callback

### 3. Bottom Controls Layout
```
[Left Arrow] [Dot] [Dot] [Active Dot] [Dot] [Dot] [Right Arrow] [Like] [Delete]
     ←          •     •        ●         •     •         →         ♥      🗑
```

- **Left side**: Previous arrow
- **Center**: Version indicator dots (active dot is wider)
- **Right side**: Next arrow, then Like, then Delete
- All in one horizontal row at the bottom

### 4. Action Buttons Below Carousel
- Rewrite/Summarize buttons stay in their original position
- Below the carousel, not inside it
- Maintains familiar panel layout
- Clear separation between content and actions

## Behavior

### Navigation
- Click left/right arrows to move between versions
- Click any dot to jump to that version
- Arrows disabled/faded when at start/end

### Editing
- Text is always in a textarea
- Type directly without clicking edit
- Changes update the current version immediately
- No save/cancel buttons needed

### Version Management
- Like button: Toggle heart (filled = liked)
- Delete button: Only visible for AI-generated versions
- Original version cannot be deleted
- Deleting navigates to previous or next version

### Loading State
- Semi-transparent white overlay appears
- Spinner centered over textarea
- Textarea disabled during loading
- Controls remain visible but disabled

## Responsive Considerations

- Textarea has min-height: 200px, max-height: 400px
- Scrolls vertically if content exceeds max height
- Bottom controls flex to accommodate all buttons
- Dots scale based on number of versions
