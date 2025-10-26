# Chrome Built-in AI APIs Implementation Guide

Reference for implementing Chrome's on-device AI APIs in Flint. All APIs are experimental and require TypeScript `@ts-ignore` comments.

## Architecture Rules

1. Centralize all AI API calls in `src/services/ai.ts` — no direct API access elsewhere
2. Always check feature availability before creating sessions
3. All session creation must occur within user gesture (click/keypress handler)
4. Provide mock fallbacks when APIs unavailable
5. Use streaming methods when available for progressive UI updates

## Core Type Definitions

```ts
// Built-in APIs (Summarizer, Rewriter, Writer, Translator, etc.)
export type BuiltInAvailability = "available" | "downloadable" | "unavailable";

// Prompt API only
export type PromptAvailability = "readily" | "after-download" | "no";

export type AiResult = {
  ok: boolean;
  text?: string;
  chunks?: AsyncIterable<string>;
  error?: string;
};
```

## API Patterns

### Summarizer API

**Availability check:**
```ts
if (!("Summarizer" in self)) return "unavailable";
const avail: BuiltInAvailability = await self.Summarizer.availability(); // no args
```

**Create and use:**
```ts
const summarizer = await self.Summarizer.create({
  type: "key-points" | "tl;dr" | "headline" | "teaser",
  format: "markdown" | "plain-text",
  length: "short" | "medium" | "long",
  sharedContext: "",
  monitor(m) {
    m.addEventListener("downloadprogress", e => {
      console.log(`Downloaded ${e.loaded * 100}%`);
    });
  },
});

// Batch
const summary = await summarizer.summarize(text, { context: "" });

// Streaming (do NOT await the factory method)
const stream = summarizer.summarizeStreaming(text, { context: "" });
for await (const chunk of stream) {
  append(chunk);
}
```

### Rewriter API

**Availability check:**
```ts
if (!("Rewriter" in self)) return "unavailable";
const avail: BuiltInAvailability = await self.Rewriter.availability(); // no args
```

**Create and use:**
```ts
const rewriter = await self.Rewriter.create({
  tone: "as-is" | "more-formal" | "more-casual",
  format: "as-is" | "markdown" | "plain-text",
  length: "as-is" | "shorter" | "longer",
  sharedContext: "",
});

const out = await rewriter.rewrite(text, { context: "" });

// Streaming
const stream = rewriter.rewriteStreaming(text, { context: "", tone: "more-casual" });
for await (const chunk of stream) {
  append(chunk);
}
```

### Writer API

**Availability check:**
```ts
if (!("Writer" in self)) return "unavailable";
const avail: BuiltInAvailability = await self.Writer.availability(); // no args
```

**Create and use:**
```ts
const writer = await self.Writer.create({
  tone: "formal" | "neutral" | "casual",
  format: "markdown" | "plain-text",
  length: "short" | "medium" | "long",
});

const draft = await writer.write("Write an intro about Flint", { context: "" });

// Streaming
const stream = writer.writeStreaming("Write a summary of …", { context: "" });
for await (const chunk of stream) {
  append(chunk);
}
```

### Prompt API (LanguageModel)

**Availability check:**
```ts
if (!("ai" in window)) return "no";
const can: PromptAvailability = await window.ai.canCreateTextSession();
// Returns "readily", "after-download", or "no"
```

**Create and use:**
```ts
if (can !== "no" && navigator.userActivation.isActive) {
  const session = await window.ai.createTextSession();
  const text = await session.prompt("Rewrite the following text …");
  
  // Streaming
  const stream = session.promptStreaming("…");
  for await (const chunk of stream) {
    append(chunk);
  }
}
```

### Translator API

**Availability check:**
```ts
if (!("Translator" in self)) return "unavailable";
const avail: BuiltInAvailability = await self.Translator.availability({
  sourceLanguage: "auto", // or explicit "en"
  targetLanguage: "es",
});
```

**Create and use:**
```ts
const translator = await self.Translator.create({
  sourceLanguage: "en",
  targetLanguage: "es",
});

const translated = await translator.translate(text);

// Streaming
const stream = translator.translateStreaming(longText);
for await (const chunk of stream) {
  append(chunk);
}
```

### Language Detector API

**Availability check:**
```ts
if (!("LanguageDetector" in self)) return "unavailable";
const avail: BuiltInAvailability = await self.LanguageDetector.availability();
```

**Create and use:**
```ts
const detector = await self.LanguageDetector.create();
const results = await detector.detect(text);
// Returns [{ detectedLanguage, confidence }, …]
```

### Proofreader API

**Availability check:**
```ts
if (!("Proofreader" in self)) return "unavailable";
const avail: BuiltInAvailability = await self.Proofreader.availability();
```

**Create and use:**
```ts
const proofreader = await self.Proofreader.create({
  expectedInputLanguages: ["en"],
});

const res = await proofreader.proofread(input);
// res.corrected: string
// res.corrections: Array<{ startIndex: number, endIndex: number, ... }>
```

## UI Integration

1. Check availability on component mount and enable/disable buttons accordingly
2. Show download progress when availability is "downloadable"
3. Bind all AI operations to button click handlers (never in useEffect)
4. Stream partial results to UI when using streaming methods
5. Display inline error banners with retry buttons on failure

## Error Handling

- `NotAllowedError`: Feature blocked by policy — show user message
- Quota/memory errors: Truncate input, suggest summarizing first
- User activation required: Ensure call is within click/keypress handler
- Network errors: Should not occur (on-device only), but handle gracefully

## Mock Fallbacks

When availability returns "unavailable" or "no", use deterministic mocks:

```ts
// src/services/ai.ts (MockAIProvider class)
export const mockSummarize = async (text: string) => 
  `• ${text.slice(0, 64)}…\n• Summary line two\n• Summary line three`;
export const mockRewrite = async (text: string) => 
  text.replace(/\s+/g, " ").trim();
```

## Critical Constraints

- Never call AI APIs in React effects without user gesture
- Keep all API logic in `src/services/ai.ts`
- Always return `{ ok: boolean, text?, error? }` result shape or throw errors
- Handle all availability states: available/readily, downloadable/after-download, unavailable/no
- No uncaught promise rejections — wrap all calls in try/catch
- Do NOT await streaming factory methods — assign then `for await` the chunks

## Origin Trials and Flags

Writer, Rewriter, and Proofreader APIs require:
- Origin trial token in manifest.json (for production)
- Chrome flags enabled during development:
  - `chrome://flags/#optimization-guide-on-device-model`
  - `chrome://flags/#writer-api-for-gemini-nano`
  - `chrome://flags/#rewriter-api-for-gemini-nano`
