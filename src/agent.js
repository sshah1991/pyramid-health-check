'use strict';

const path             = require('path');
const { scan }         = require('./scanner');
const { printReport }  = require('./reporter');
const { writeReport }  = require('./htmlReporter');

async function run() {
  const args     = process.argv.slice(2);
  const helpFlag = args.includes('--help') || args.includes('-h');

  if (helpFlag || args.length === 0) {
    console.log(`
  pyramid-health — Test pyramid analyzer for Playwright and Jest

  Usage:
    node bin/pyramid-health.js <path-to-tests>

  Examples:
    node bin/pyramid-health.js ./tests
    node bin/pyramid-health.js ./src/__tests__
    node bin/pyramid-health.js .

  Tag mapping (Playwright/Jest):
    @smoke      → unit
    @sanity     → integration
    @regression → e2e

  Folder fallback (if no tags found):
    /unit/        → unit
    /integration/ → integration
    /e2e/         → e2e

  Output:
    Terminal report printed inline.
    HTML report saved to ./reports/pyramid-report-<timestamp>.html
    `);
    process.exit(0);
  }

  const inputPath = args[0];
  const rootDir   = path.resolve(process.cwd(), inputPath);

  // Step 1: Scan
  console.log(`\n  Scanning: ${rootDir}`);
  const scanResult = scan(rootDir);

  if (scanResult.error) {
    console.error(`\n  Error: ${scanResult.error}\n`);
    process.exit(1);
  }

  if (scanResult.total === 0) {
    console.error('\n  No tagged tests found. Ensure tests use @smoke, @sanity, or @regression tags,');
    console.error('  or organise files under unit/, integration/, e2e/ folders.\n');
    process.exit(1);
  }

  // Step 2: Terminal report
  printReport(scanResult);

  // Step 3: HTML report
  const htmlPath = writeReport(scanResult);
  console.log(`  HTML report saved → ${htmlPath}\n`);
}

module.exports = { run };
