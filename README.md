# pyramid-agent

AI-powered test pyramid analyzer for Playwright and Jest projects.

Point it at any test folder — it scans your suite, calculates your unit/integration/e2e ratio, compares it against the industry benchmark (70/20/10), and generates an opinionated analysis using Claude AI.

---

## Quick start

```bash
# Run directly without installing
npx pyramid-agent ./tests

# Or install globally
npm install -g pyramid-agent
pyramid-agent ./tests
```

---

## Setup (AI analysis)

```bash
export ANTHROPIC_API_KEY=your_key_here
```

Without a key, the tool still scans and reports — AI analysis is skipped.

---

## How it classifies tests

**Tag-based (Playwright / Jest):**

```typescript
test('my test', { tag: '@smoke' }, async () => { ... })      // → unit
test('my test', { tag: '@sanity' }, async () => { ... })     // → integration
test('my test', { tag: '@regression' }, async () => { ... }) // → e2e
```

**Folder-based fallback (if no tags):**

```
tests/
  unit/           → unit
  integration/    → integration
  e2e/            → e2e
```

---

## Example output

```
─────────────────────────────────────────────────────────────
  TEST PYRAMID AGENT
─────────────────────────────────────────────────────────────
  Files scanned : 4
  Total tests   : 41

  Unit           3 tests
  ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  7.3% actual / 70% benchmark
  -62.7%  ⚠ under

  Integration    8 tests
  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  19.5% actual / 20% benchmark
  -0.5%  ✓ ok

  E2E           30 tests
  █████████████████████████████████░░░░░░░  73.2% actual / 10% benchmark
  +63.2%  ⚠ over

─────────────────────────────────────────────────────────────
  AI ANALYSIS
─────────────────────────────────────────────────────────────

  VERDICT: This pyramid is inverted and at critical risk...
  ...
```

---

## Usage options

```bash
pyramid-agent <path>           # Analyze with AI
pyramid-agent <path> --no-ai   # Analyze without AI (offline)
pyramid-agent --help           # Show usage
```

---

## Benchmark

| Layer       | Industry standard |
|-------------|-------------------|
| Unit        | 70%               |
| Integration | 20%               |
| E2E         | 10%               |

---

## Why this matters

An e2e-heavy suite is the most common and most expensive QA mistake. Each e2e test costs 10–50x more to maintain than a unit test. This agent makes that visible — and tells you exactly what to do about it.

---

## License

MIT
