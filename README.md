<div align="center">

# ▲ pyramid-health

**Test pyramid health analyzer for Playwright and Jest suites.**

Scan your test suite. Detect anti-patterns. Generate a visual report. One command.

[![Node.js](https://img.shields.io/badge/Node.js-16%2B-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen?style=flat)](https://github.com/sshah1991/pyramid-health-check)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat)](LICENSE)
[![Built by Sumeet Shah](https://img.shields.io/badge/built%20by-Sumeet%20Shah-0694A2?style=flat)](https://github.com/sshah1991)

</div>

---

## What is pyramid-health?

Most test suites drift over time — too many slow E2E tests, not enough fast unit tests, integration layer missing entirely. This creates flaky CI pipelines, expensive debugging cycles, and no confidence at deploy time.

**pyramid-health** scans your Playwright or Jest test files, calculates how your tests are distributed across unit / integration / E2E layers, compares them against the [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) benchmark, and tells you exactly what's wrong and what to fix — in a single command.

---

## Demo

![Pyramid Health Report](docs/report-preview.png)

> *Light-mode HTML report with interactive charts, sortable file table, dark mode toggle, and per-file copy paths.*

---

## Features

| Feature | Description |
|---|---|
| **Health Score** | Single 0–100 score — Healthy / At Risk / Critical |
| **Pyramid Analysis** | Unit / Integration / E2E ratios vs Testing Trophy benchmark |
| **Anti-pattern Detection** | Ice Cream Cone, Hourglass, Flat Pyramid, No Unit Base |
| **Execution Scope Tracking** | `@smoke` / `@sanity` / `@regression` distribution with donut chart |
| **Visual HTML Report** | Interactive charts, sticky header, dark mode, file search, copy paths |
| **Terminal Report** | Colour-coded output with bar charts, file breakdown, spotlight |
| **Dual Tag Support** | `@layer-*` for pyramid layer + `@smoke/@sanity/@regression` for CI scope |
| **Folder Fallback** | Classifies by `unit/` `integration/` `e2e/` folder names if no tags found |
| **Zero Dependencies** | Pure Node.js — no npm install required |

---

## Prerequisites

- Node.js 16 or higher
- A Playwright or Jest test suite

Check your Node.js version:

```bash
node --version
```

---

## Getting Started

### Step 1 — Clone the repository

```bash
git clone https://github.com/sshah1991/pyramid-health-check.git
cd pyramid-health-check
```

No `npm install` needed. The tool has zero runtime dependencies.

### Step 2 — Tag your tests (recommended)

pyramid-health uses a **dual tag approach**. Each test carries two independent tags:

| Tag type | Purpose | Available tags |
|---|---|---|
| Pyramid layer | Which layer this test belongs to | `@layer-unit` · `@layer-integration` · `@layer-e2e` |
| Execution scope | When this test runs in CI | `@smoke` · `@sanity` · `@regression` |

**Playwright:**

```typescript
// Critical login flow — runs on every deploy, classified as E2E layer
test('User can log in', { tag: ['@smoke', '@layer-e2e'] }, async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'user@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('[type=submit]');
  await expect(page).toHaveURL('/dashboard');
});

// Token validation — full regression run, classified as unit layer
test('JWT returns 401 on expiry', { tag: ['@regression', '@layer-unit'] }, async () => {
  const result = validateToken('expired.token.here');
  expect(result.valid).toBe(false);
  expect(result.status).toBe(401);
});
```

**Jest:**

```typescript
// @layer-unit @smoke
it('validates JWT expiry', () => {
  expect(validateToken('expired')).toEqual({ valid: false, status: 401 });
});
```

> **No tags yet?** That's fine. pyramid-health falls back to folder name classification automatically (see [Folder Fallback](#folder-fallback)).

### Step 3 — Run pyramid-health

Point it at your test folder:

```bash
node bin/pyramid-health.js <path-to-your-tests>
```

**Examples:**

```bash
# Playwright suite
node bin/pyramid-health.js ./tests

# Jest suite
node bin/pyramid-health.js ./src/__tests__

# Scan everything from project root
node bin/pyramid-health.js .

# Absolute path
node bin/pyramid-health.js /Users/yourname/projects/my-app/tests
```

### Step 4 — Read your results

Two outputs are generated simultaneously:

**Terminal** — instant colour-coded summary:

```
════════════════════════════════════════════════════════════
                    ▲  PYRAMID HEALTH  ▲
════════════════════════════════════════════════════════════
  Files scanned : 6   Total tests : 176
  Health Score  : HEALTHY (89/100)
────────────────────────────────────────────────────────────

  Unit (@layer-unit)              52 tests  ▲ +14.5% over
  ████████████░░░░░░░░░░░░░░░░░░░░  29.5% actual / 15% benchmark

  Integration (@layer-integration) 47 tests  ✓ +1.7% ok
  ████████░░░░░░░░░░░░░░░░░░░░░░░░  26.7% actual / 25% benchmark

  E2E (@layer-e2e)                77 tests  ▼ -16.2% under
  ███████████████░░░░░░░░░░░░░░░░░  43.8% actual / 60% benchmark

  HTML report saved → ./reports/pyramid-report-2026-06-09T11-30-00.html
```

**HTML Report** — open in any browser:

```bash
open reports/pyramid-report-*.html        # macOS
start reports/pyramid-report-*.html       # Windows
xdg-open reports/pyramid-report-*.html   # Linux
```

The HTML report includes:
- Health score badge with Healthy / At Risk / Critical status
- Pyramid diagram with benchmark reference lines
- Actual vs benchmark horizontal bar chart
- Execution scope donut chart (`@smoke` / `@sanity` / `@regression`)
- Diagnosis with anti-pattern detection
- Numbered recommendations with over/under context
- Sortable, searchable file breakdown table with click-to-copy paths
- Dark mode toggle
- Download button to share the report

---

## Folder Fallback

If your tests have no `@layer-*` tags, pyramid-health automatically classifies by folder name:

```
tests/
├── unit/                    → classified as unit layer
│   ├── auth.test.ts
│   └── validation.test.ts
├── integration/             → classified as integration layer
│   └── api.test.ts
└── e2e/                     → classified as E2E layer
    └── checkout.spec.ts
```

The terminal and HTML report both show which classification mode was used:
- `@layer-* tags` — all files tagged explicitly
- `folder fallback` — classified by directory name
- `mixed` — some files tagged, some falling back

---

## Understanding the Benchmark

pyramid-health uses the **Testing Trophy model**, calibrated for Playwright and API-heavy suites:

| Layer | Benchmark | Rationale |
|---|---|---|
| Unit | 15% | Fast, isolated logic validation |
| Integration | 25% | API contracts, service boundaries |
| E2E | 60% | User journeys, UI flows — Playwright's sweet spot |

> This intentionally differs from the classic 70/20/10 pyramid. Playwright suites naturally skew toward E2E and integration. The Trophy model reflects real-world usage.

A **Health Score** is calculated as:

```
score = 100 - average deviation across all three layers
```

Scores above 80 are Healthy. 50–79 are At Risk. Below 50 is Critical.

---

## Anti-pattern Reference

| Pattern | Triggers when | Business impact |
|---|---|---|
| 🍦 **Ice Cream Cone** | E2E > 80%, Unit < 10% | Slowest possible CI, maximum flakiness, every change is expensive |
| ⏳ **Hourglass** | Unit > 30%, E2E > 50%, Integration < 10% | Bugs in service boundaries slip through undetected |
| ⚠ **No Unit Base** | Unit < 5% | No fast feedback loop — every bug costs maximum developer time |
| ▬ **Flat Pyramid** | Even spread with no clear strategy | Random test distribution, no confidence in layer priorities |
| ▲ **Healthy Pyramid** | All layers within 5% of benchmark | Balanced, fast, maintainable test suite |

---

## Project Structure

```
pyramid-health-check/
├── bin/
│   └── pyramid-health.js     # CLI entry point
├── src/
│   ├── agent.js              # Orchestrator — wires scan → terminal → HTML
│   ├── scanner.js            # File walker, tag parser, layer classifier
│   ├── reporter.js           # Terminal report renderer (colour-coded)
│   └── htmlReporter.js       # HTML report generator (Chart.js, dark mode)
├── reports/                  # Generated reports — add to .gitignore
└── README.md
```

---

## Adding to .gitignore

Generated reports should not be committed:

```bash
echo "reports/" >> .gitignore
```

---

## In Progress

- `--json` output flag for CI integration
- GitHub Actions step summary support
- Flakiness detection via test run history
- AI-powered diagnosis — natural language insights per file
- Scaffold generation — auto-generate missing unit test stubs
- `--watch` mode — re-scan on file changes

---

## Contributing

Issues and pull requests are welcome. Please open an issue first to discuss what you'd like to change.

---

## Built With

- **Node.js** — zero runtime dependencies
- **[Chart.js 4.4](https://www.chartjs.org/)** — interactive charts in HTML report
- **[Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)** — benchmark model by Kent C. Dodds
- **[Inter](https://rsms.me/inter/) + [JetBrains Mono](https://www.jetbrains.com/lp/mono/)** — typography

---

## Author

**Sumeet Shah**  
Associate Lead QA Engineer · 10+ years in QA · Playwright · Agentic AI for Testing

[![GitHub](https://img.shields.io/badge/GitHub-sshah1991-181717?style=flat&logo=github)](https://github.com/sshah1991)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-sumeetshah1991-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/sumeetshah1991)

---

## License

MIT — free to use, modify, and distribute.
