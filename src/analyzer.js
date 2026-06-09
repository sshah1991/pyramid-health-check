'use strict';

const https = require('https');

const BENCHMARK = { unit: 70, integration: 20, e2e: 10 };

function buildPrompt(scanResult) {
  const { counts, total, files, rootDir } = scanResult;

  const ratios = {};
  const deviations = {};
  for (const layer of ['unit', 'integration', 'e2e']) {
    ratios[layer]     = total > 0 ? +((counts[layer] / total) * 100).toFixed(1) : 0;
    deviations[layer] = +(ratios[layer] - BENCHMARK[layer]).toFixed(1);
  }

  const fileList = files
    .slice(0, 10)
    .map(f => `  ${f.name} (unit:${f.layers.unit} integration:${f.layers.integration} e2e:${f.layers.e2e})`)
    .join('\n');

  return `You are a senior QA lead reviewing a test suite pyramid analysis.

## Test Suite Data
- Root: ${rootDir}
- Total tests: ${total}
- Files scanned: ${scanResult.filesScanned}

## Pyramid Breakdown
| Layer       | Count | Actual | Benchmark | Delta  |
|-------------|-------|--------|-----------|--------|
| Unit        | ${counts.unit}  | ${ratios.unit}%  | 70%  | ${deviations.unit > 0 ? '+' : ''}${deviations.unit}% |
| Integration | ${counts.integration}  | ${ratios.integration}%  | 20%  | ${deviations.integration > 0 ? '+' : ''}${deviations.integration}% |
| E2E         | ${counts.e2e}  | ${ratios.e2e}%  | 10%  | ${deviations.e2e > 0 ? '+' : ''}${deviations.e2e}% |
| Untagged    | ${counts.untagged} | — | — | — |

## File Breakdown (top 10)
${fileList}

## Your Task
Write a concise QA lead report with these sections:

**VERDICT** (1 sentence — is this pyramid healthy, at risk, or critical?)

**WHAT'S WRONG** (bullet points — specific problems with business impact, not generic advice)

**RECOMMENDED ACTIONS** (prioritised list — concrete steps, reference actual layer counts)

**RISK IF IGNORED** (1-2 sentences — what breaks in production if this is left unaddressed)

Be direct, opinionated, and specific. Reference the actual numbers. Sound like a senior engineer, not a tool.`;
}

function callClaude(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages:   [{ role: 'user', content: prompt }],
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = parsed.content?.[0]?.text || '';
          resolve(text);
        } catch (e) {
          reject(new Error('Failed to parse Claude response'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function analyze(scanResult, apiKey) {
  if (!apiKey) {
    return '[AI analysis skipped — set ANTHROPIC_API_KEY to enable]\n\nRun: export ANTHROPIC_API_KEY=your_key_here';
  }

  const prompt = buildPrompt(scanResult);
  return await callClaude(prompt, apiKey);
}

module.exports = { analyze, BENCHMARK };
