# Testing Checklist: Cursor Context Awareness

## Pre-Testing Setup

- [ ] Build the extension: `npm run build`
- [ ] Load unpacked extension in Chrome
- [ ] Open Chrome DevTools Console (to see debug logs)
- [ ] Enable Context Awareness in Flint settings

## Test Cases

### Test 1: Mid-Sentence Generation ⭐ CRITICAL
**Setup:**
1. Create document: "The quick brown fox jumped over the lazy dog."
2. Place cursor between "fox" and "jumped" (after the space)
3. Click Generate
4. Enter prompt: "add an adjective"

**Expected:**
- Console shows `cursorOffset` matching cursor position
- Console shows `textBeforeCursor: "...brown fox "`
- Console shows `textAfterCursor: "jumped over..."`
- Generated text fits naturally (e.g., "gracefully")

**Pass Criteria:**
- [ ] Console logs show correct cursor offset
- [ ] Generated text flows naturally at cursor position
- [ ] No repetition of surrounding words

---

### Test 2: After Punctuation
**Setup:**
1. Create document: "First sentence. Second sentence."
2. Place cursor after the period (before space)
3. Click Generate
4. Enter prompt: "add transition"

**Expected:**
- AI sees period before cursor
- Generates appropriate transition text
- Maintains proper spacing

**Pass Criteria:**
- [ ] Generated text starts with space if needed
- [ ] Transition flows naturally between sentences
- [ ] Capitalization is correct

---

### Test 3: Start of Document
**Setup:**
1. Create document: "The quick brown fox"
2. Place cursor at very start (position 0)
3. Click Generate
4. Enter prompt: "add intro"

**Expected:**
- Console shows `textBeforeCursor: ""`
- Console shows `textAfterCursor: "The quick brown fox"`
- Generated text leads into existing content

**Pass Criteria:**
- [ ] Console shows empty before context
- [ ] Generated text connects to existing text
- [ ] No awkward spacing

---

### Test 4: End of Document
**Setup:**
1. Create document: "The quick brown fox"
2. Place cursor at very end
3. Click Generate
4. Enter prompt: "continue the story"

**Expected:**
- Console shows `textAfterCursor: ""`
- Generated text continues naturally

**Pass Criteria:**
- [ ] Console shows empty after context
- [ ] Generated text extends the narrative
- [ ] Proper spacing before generated text

---

### Test 5: Mid-Word (Edge Case)
**Setup:**
1. Create document: "The cat jumped over the fence."
2. Place cursor in middle of "jumped" (e.g., "jum|ped")
3. Click Generate
4. Enter prompt: "continue"

**Expected:**
- Console shows partial word before: "jum"
- Console shows partial word after: "ped"
- AI handles gracefully (either completes word or adds after)

**Pass Criteria:**
- [ ] Console shows correct split
- [ ] AI doesn't break the existing word
- [ ] Result is grammatically correct

---

### Test 6: After Comma
**Setup:**
1. Create document: "I went to the store, and then I went home."
2. Place cursor after comma (before space)
3. Click Generate
4. Enter prompt: "add detail"

**Expected:**
- AI sees comma before cursor
- Generates text that fits with comma structure

**Pass Criteria:**
- [ ] Generated text respects comma placement
- [ ] Maintains list/clause structure
- [ ] Proper spacing

---

### Test 7: Multiple Paragraphs
**Setup:**
1. Create document with multiple paragraphs:
   ```
   First paragraph with some text.
   
   Second paragraph here.
   ```
2. Place cursor between paragraphs
3. Click Generate
4. Enter prompt: "add transition paragraph"

**Expected:**
- AI sees paragraph break
- Generates appropriate transition

**Pass Criteria:**
- [ ] Maintains paragraph structure
- [ ] Transition flows naturally
- [ ] Spacing is correct

---

### Test 8: With Enhanced Context Engine
**Setup:**
1. Create longer document (500+ words) with multiple sections
2. Place cursor in middle of a paragraph
3. Enable "Context Awareness" in settings
4. Click Generate
5. Enter prompt: "expand on this point"

**Expected:**
- Console shows related sections found
- Console shows correct cursor offset
- Generated text uses information from related sections

**Pass Criteria:**
- [ ] Console shows `relatedSections: 3` (or similar)
- [ ] Generated text is contextually aware
- [ ] No repetition from related sections
- [ ] Cursor position is still accurate

---

## Console Log Verification

For each test, verify the console shows:

```javascript
[AI] Enhanced context assembled: {
  localChars: [number],
  cursorOffset: [number],
  textBeforeCursor: "[last 50 chars]",
  textAfterCursor: "[first 50 chars]",
  relatedSections: [number],
  totalChars: [number]
}
```

**Check:**
- [ ] `cursorOffset` matches expected cursor position
- [ ] `textBeforeCursor` shows correct text before cursor
- [ ] `textAfterCursor` shows correct text after cursor

---

## Regression Tests

Ensure existing functionality still works:

- [ ] Generate at end of document (no context after)
- [ ] Generate at start of document (no context before)
- [ ] Generate in empty document
- [ ] Rewrite selected text
- [ ] Summarize selected text
- [ ] Undo/Redo after generation

---

## Performance Check

- [ ] Generation completes in reasonable time (<5 seconds)
- [ ] No console errors or warnings
- [ ] UI remains responsive during generation
- [ ] Context assembly doesn't cause lag

---

## Edge Cases

- [ ] Very long document (10,000+ words)
- [ ] Document with special characters
- [ ] Document with code blocks
- [ ] Document with mixed languages
- [ ] Cursor at position 0
- [ ] Cursor at last position

---

## Success Criteria

✅ All critical tests pass (Tests 1-4)  
✅ Console logs show correct cursor positioning  
✅ Generated text flows naturally at insertion point  
✅ No regressions in existing features  
✅ No TypeScript or build errors  

---

## If Tests Fail

1. Check console for error messages
2. Verify cursor offset calculation
3. Check if context is being split correctly
4. Verify AI prompt includes cursor position instruction
5. Test with simpler documents first
6. Check if context awareness setting is enabled

---

## Notes

- The fix primarily affects the **Generate** tool when cursor is mid-document
- Rewrite and Summarize tools work on selections, not cursor position
- Enhanced context engine should work with or without the fix
- The fix makes the context engine more precise, not fundamentally different
