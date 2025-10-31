# Excessive Project Refreshes Fix

## Problem
The panel was experiencing excessive refreshes with console messages like "Current project refreshed after update" appearing repeatedly. This was causing performance issues and console spam.

## Root Cause
The `loadProjects` function had `currentProject` in its dependency array, which created a refresh loop:
1. Auto-save updates `currentProject` state
2. `loadProjects` callback is recreated (due to dependency on `currentProject`)
3. Any component using `loadProjects` re-renders
4. This triggers another refresh cycle

## Solution

### 1. Fixed Dependency Loop
- Changed `loadProjects` to use `currentProjectRef.current` instead of `currentProject` state
- Removed `currentProject` from the dependency array
- This makes `loadProjects` stable and prevents unnecessary recreations

### 2. Reduced Console Logging
- Removed verbose auto-save logs that fired every 500ms
- Only log project refresh when title actually changes
- Commented out routine save success messages
- Keep error logs for debugging

## Changes Made

**Before:**
```typescript
const loadProjects = useCallback(async () => {
  // ... code ...
  if (currentProject) {
    // Uses state, causes dependency
  }
}, [currentProject]); // Recreated on every project update
```

**After:**
```typescript
const loadProjects = useCallback(async () => {
  // ... code ...
  const currentProj = currentProjectRef.current; // Use ref
  if (currentProj) {
    // Stable reference
  }
}, []); // No dependencies - stable callback
```

## Result
- No more refresh loops
- Cleaner console output
- Better performance during typing/auto-save
- Project updates still work correctly

## Files Modified
- `src/panel/panel.tsx` - Fixed loadProjects dependencies and reduced logging
