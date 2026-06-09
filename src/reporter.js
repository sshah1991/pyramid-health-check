'use strict';

const BENCHMARK = { unit: 15, integration: 25, e2e: 60 };

const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bgRed:   '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgBlue:  '\x1b[44m',
  bgCyan:  '\x1b[46m',
};

const W = 60; // total report width

function line(char = '─') {
  return C.dim + char.repeat(W) + C.reset;
}

function centerText(text, width = W) {
  const stripped = text.replace(/\x1b\[[0-9;]*m/g, '');
  const pad = Math.max(0, Math.floor((width - stripped.length) / 2));
  return ' '.repeat(pad) + text;
}

function bar(percent, max = 36) {
  const filled = Math.round((percent / 100) * max);
  const empty  = max - filled;
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
}

function layerColor(key) {
  if (key === 'unit')        return C.cyan;
  if (key === 'integration') return C.blue;
  return C.magenta;
}

function deltaColor(dev) {
  if (Math.abs(dev) <= 5)  return C.green;
  if (Math.abs(dev) <= 15) return C.yellow;
  return C.red;
}

function deviationLabel(dev) {
  if (dev > 10)  return `▲ +${dev}% over`;
  if (dev < -10) return `▼ ${dev}% under`;
  return `✓ ${dev > 0 ? '+' : ''}${dev}% ok`;
}

function healthScore(ratios) {
  // Score 0-100 based on how close each layer is to benchmark
  const deviations = Object.keys(BENCHMARK).map(k => Math.abs(ratios[k] - BENCHMARK[k]));
  const avgDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  return Math.max(0, Math.round(100 - avgDev));
}

function scoreLabel(score) {
  if (score >= 80) return `${C.green}${C.bold}HEALTHY (${score}/100)${C.reset}`;
  if (score >= 50) return `${C.yellow}${C.bold}AT RISK (${score}/100)${C.reset}`;
  return `${C.red}${C.bold}CRITICAL (${score}/100)${C.reset}`;
}

function detectPattern(ratios) {
  if (ratios.e2e > 80 && ratios.unit < 10) {
    return {
      name: 'ICE CREAM CONE',
      color: C.red,
      icon: '🍦',
      description: 'Too many E2E, too few unit tests.',
      impact: 'Slow CI pipelines, high maintenance cost, flaky feedback.',
    };
  }
  if (ratios.unit > 30 && ratios.e2e > 50 && ratios.integration < 10) {
    return {
      name: 'HOURGLASS',
      color: C.yellow,
      icon: '⏳',
      description: 'Unit and E2E present but integration layer is missing.',
      impact: 'Bugs slip through the gap between unit and E2E coverage.',
    };
  }
  if (ratios.unit < 5) {
    return {
      name: 'NO UNIT BASE',
      color: C.red,
      icon: '⚠',
      description: 'Unit layer is critically thin.',
      impact: 'No fast feedback loop. Every bug costs maximum time to catch.',
    };
  }
  if (ratios.unit >= 10 && ratios.unit <= 20 && ratios.integration >= 20 && ratios.e2e >= 40 && ratios.e2e <= 65) {
    return {
      name: 'FLAT PYRAMID',
      color: C.yellow,
      icon: '▬',
      description: 'No strategic layer distribution.',
      impact: 'Random test distribution with no deliberate pyramid strategy.',
    };
  }
  return {
    name: 'HEALTHY PYRAMID',
    color: C.green,
    icon: '▲',
    description: 'Pyramid shape is well balanced.',
    impact: null,
  };
}

function worstFile(files) {
  return files.slice().sort((a, b) => {
    const eA = a.layers.e2e / (a.total || 1);
    const eB = b.layers.e2e / (b.total || 1);
    return eB - eA;
  })[0];
}

function healthiestFile(files) {
  return files.slice().sort((a, b) => {
    const scoreFile = f => {
      const r = {
        unit:        (f.layers.unit        / (f.total || 1)) * 100,
        integration: (f.layers.integration / (f.total || 1)) * 100,
        e2e:         (f.layers.e2e         / (f.total || 1)) * 100,
      };
      return healthScore(r);
    };
    return scoreFile(b) - scoreFile(a);
  })[0];
}

function printReport(scanResult) {
  const { counts, total, files, filesScanned } = scanResult;

  const ratios = {};
  const deviations = {};
  for (const layer of ['unit', 'integration', 'e2e']) {
    ratios[layer]     = total > 0 ? +((counts[layer] / total) * 100).toFixed(1) : 0;
    deviations[layer] = +(ratios[layer] - BENCHMARK[layer]).toFixed(1);
  }

  const score   = healthScore(ratios);
  const pattern = detectPattern(ratios);
  const worst   = worstFile(files);
  const best    = healthiestFile(files);

  // ── HEADER ────────────────────────────────────────────────────────────────
  console.log('\n' + line('═'));
  console.log(centerText(C.bold + C.cyan + '  ▲  PYRAMID HEALTH  ▲' + C.reset));
  console.log(line('═'));
  console.log(`  ${C.dim}Files scanned : ${C.reset}${C.bold}${filesScanned}${C.reset}${C.dim}   Total tests : ${C.reset}${C.bold}${total}${C.reset}`);
  console.log(`  ${C.dim}Health Score  : ${C.reset}${scoreLabel(score)}`);
  console.log(line());

  // ── TAG MAPPING NOTE ──────────────────────────────────────────────────────
  console.log('');
  console.log(`  ${C.bold}Tag Mapping (Playwright / Jest):${C.reset}`);
  console.log(`  ${C.cyan}@layer-unit${C.reset}         → Unit         ${C.dim}(primary — explicit pyramid classification)${C.reset}`);
  console.log(`  ${C.blue}@layer-integration${C.reset}  → Integration  ${C.dim}(primary — explicit pyramid classification)${C.reset}`);
  console.log(`  ${C.magenta}@layer-e2e${C.reset}          → E2E          ${C.dim}(primary — explicit pyramid classification)${C.reset}`);
  console.log(`  ${C.dim}Fallback: folder names (unit/ integration/ e2e/) used when no @layer-* tags found${C.reset}`);
  console.log(`  ${C.dim}Benchmark: unit=15%  integration=25%  e2e=60%  (Testing Trophy model for Playwright/API suites)${C.reset}`);
  const modeStr = scanResult.mode === 'layer-tags' ? `${C.green}@layer-* tags${C.reset}` : scanResult.mode === 'folder' ? `${C.yellow}folder fallback${C.reset}` : `${C.yellow}mixed (partial @layer-* tags)${C.reset}`;
  console.log(`  ${C.dim}Classification mode : ${C.reset}${modeStr}`);
  console.log('');
  console.log(line());

  // ── PYRAMID LAYERS ────────────────────────────────────────────────────────
  console.log('');
  const layers = [
    { name: 'Unit (@layer-unit)', key: 'unit' },
    { name: 'Integration (@layer-integration)', key: 'integration' },
    { name: 'E2E (@layer-e2e)  ', key: 'e2e' },
  ];

  for (const { name, key } of layers) {
    const count  = counts[key];
    const actual = ratios[key];
    const bench  = BENCHMARK[key];
    const dev    = deviations[key];
    const lc     = layerColor(key);
    const dc     = deltaColor(dev);
    const devStr = deviationLabel(dev);

    console.log(`  ${lc}${C.bold}${name.padEnd(13)}${C.reset}  ${String(count).padStart(4)} tests  ${dc}${devStr}${C.reset}`);
    console.log(`  ${lc}${bar(actual)}${C.reset}  ${C.bold}${actual}%${C.reset} ${C.dim}actual / ${bench}% benchmark${C.reset}`);
    console.log('');
  }

  // ── FILE BREAKDOWN ────────────────────────────────────────────────────────
  console.log(line());
  console.log(`  ${C.bold}FILE BREAKDOWN${C.reset}`);
  console.log(line());
  console.log('');

  for (const f of files) {
    const isWorst = f.name === worst.name;
    const isBest  = f.name === best.name;
    const tag     = isWorst ? ` ${C.bgRed}${C.white} WORST ${C.reset}` : isBest ? ` ${C.bgGreen}${C.white} BEST  ${C.reset}` : '';
    const name    = f.name.substring(0, 42).padEnd(42);
    const u = String(f.layers.unit).padStart(3);
    const i = String(f.layers.integration).padStart(3);
    const e = String(f.layers.e2e).padStart(3);

    console.log(`  ${C.dim}${name}${C.reset}${tag}`);
    console.log(`  ${C.cyan}unit:${u}${C.reset}  ${C.blue}int:${i}${C.reset}  ${C.magenta}e2e:${e}${C.reset}`);
    console.log('');
  }

  // ── SPOTLIGHT ─────────────────────────────────────────────────────────────
  console.log(line());
  console.log(`  ${C.bold}SPOTLIGHT${C.reset}`);
  console.log(line());
  console.log('');

  const worstE2ePct = Math.round((worst.layers.e2e / worst.total) * 100);
  console.log(`  ${C.red}${C.bold}⚠ Worst offender  :${C.reset} ${worst.name}`);
  console.log(`  ${C.dim}  ${worst.layers.e2e} of ${worst.total} tests are E2E (${worstE2ePct}%) — highest rebalancing priority${C.reset}`);
  console.log('');

  const bestUnitPct = Math.round((best.layers.unit / best.total) * 100);
  console.log(`  ${C.green}${C.bold}✓ Healthiest file  :${C.reset} ${best.name}`);
  console.log(`  ${C.dim}  ${best.layers.unit} unit / ${best.layers.integration} integration / ${best.layers.e2e} e2e — use this as your reference${C.reset}`);
  console.log('');

  // ── DIAGNOSIS ─────────────────────────────────────────────────────────────
  console.log(line());
  console.log(`  ${C.bold}DIAGNOSIS${C.reset}`);
  console.log(line());
  console.log('');
  console.log(`  ${pattern.color}${C.bold}${pattern.icon}  ${pattern.name}${C.reset}`);
  console.log(`  ${C.dim}${pattern.description}${C.reset}`);
  if (pattern.impact) {
    console.log(`  ${C.yellow}Impact: ${pattern.impact}${C.reset}`);
  }
  console.log('');

  // Per-layer recommendations
  console.log(`  ${C.bold}Recommendations:${C.reset}`);
  let hasRec = false;
  for (const layer of ['unit', 'integration', 'e2e']) {
    const dev = deviations[layer];
    const label = layer === 'unit' ? 'unit (@layer-unit)' : layer === 'integration' ? 'integration (@layer-integration)' : 'e2e (@layer-e2e)';
    if (dev < -5) {
      console.log(`  ${C.yellow}→ Add more ${label} tests (${Math.abs(dev)}% below benchmark)${C.reset}`);
      hasRec = true;
    } else if (dev > 5) {
      console.log(`  ${C.yellow}→ Consider pushing some ${label} tests down to a lower layer (${dev}% over benchmark)${C.reset}`);
      hasRec = true;
    }
  }
  if (!hasRec) {
    console.log(`  ${C.green}✓ All layers are within 5% of the benchmark — no immediate action needed${C.reset}`);
  }

  console.log('\n' + line('═') + '\n');
}

module.exports = { printReport };
