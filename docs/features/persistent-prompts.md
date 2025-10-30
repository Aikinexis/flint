# Persistent Prompts Across Tool Switches

## Overview

Prompts are now preserved when switching between Generate, Rewrite, and Summarize tools. This allows you to work on multiple tasks without losing your custom prompts.

## How It Works

### Before (Old Behavior)
```
1. Go to Rewrite tab
2. Type custom prompt: "Make this more professional"
3. Switch to Generate tab
4. Switch back to Rewrite tab
5. ❌ Prompt is gone - have to retype it
```

### After (New Behavior)
```
1. Go to Rewrite tab
2. Type custom prompt: "Make this more professional"
3. Switch to Generate tab
4. Switch back to Rewrite tab
5. ✅ Prompt is still there - ready to use
```

## Benefits

✅ **No Lost Work:** Your prompts persist across tool switches

✅ **Better Workflow:** Work on multiple tasks without retyping prompts

✅ **Faster Iteration:** Quickly switch between tools while maintaining context

✅ **Independent State:** Each tool maintains its own prompt separately

## Technical Details

### State Management

Prompts are now managed at the panel level (parent component) rather than within each tool component:

- **Generate Prompt:** Persists when switching to Rewrite or Summarize
- **Rewrite Prompt:** Persists when switching to Generate or Summarize  
- **Summarize Prompt:** Persists when switching to Generate or Rewrite

### Implementation

The prompts are stored in the parent component (`panel.tsx`) and passed down as controlled props to `ToolControlsContainer`:

```typescript
// Parent state
const [generatePrompt, setGeneratePrompt] = useState('');
const [rewritePrompt, setRewritePrompt] = useState('');
const [summarizePrompt, setSummarizePrompt] = useState('');

// Passed to child component
<ToolControlsContainer
  generatePrompt={generatePrompt}
  onGeneratePromptChange={setGeneratePrompt}
  // ... other props
/>
```

### Scope

Prompts persist:
- ✅ Across tool tab switches
- ✅ During the current session
- ❌ Not across browser restarts (future enhancement)
- ❌ Not across different projects (each project has its own session)

## Use Cases

### Use Case 1: Iterative Refinement
```
1. Write draft in Generate with prompt "Write a blog intro"
2. Switch to Rewrite to polish a paragraph
3. Switch back to Generate - prompt still there
4. Continue generating more content with same style
```

### Use Case 2: Multiple Custom Prompts
```
1. Set up Rewrite prompt: "Make this more technical"
2. Set up Summarize prompt: "Focus on key metrics"
3. Switch between tools as needed
4. Both prompts remain available
```

### Use Case 3: Voice Input Workflow
```
1. Use voice to dictate Generate prompt
2. Switch to Rewrite to edit existing text
3. Switch back to Generate
4. Voice-dictated prompt is still there
```

## Future Enhancements

Potential improvements:
- Save prompts to browser storage (persist across sessions)
- Prompt templates/favorites
- Per-project prompt history
- Sync prompts across devices
