'use strict';

const fs   = require('fs');
const path = require('path');

// ── Layer tag map ─────────────────────────────────────────────────────────────
// Primary: @layer-* tags (explicit pyramid classification)
// Fallback: folder name conventions
const LAYER_TAGS = {
  '@layer-unit':        'unit',
  '@layer-integration': 'integration',
  '@layer-e2e':         'e2e',
};

const FOLDER_MAP = {
  'unit':        'unit',
  'integration': 'integration',
  'e2e':         'e2e',
  'end-to-end':  'e2e',
};

const TEST_FILE_PATTERN = /\.(spec|test)\.(ts|js|tsx|jsx)$/;
const SKIP_DIRS = ['node_modules', '.git', 'dist', 'coverage', '.next'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function walkDir(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.includes(entry.name)) continue;
      walkDir(full, files);
    } else if (TEST_FILE_PATTERN.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function classifyByLayerTag(content) {
  // Matches: '@layer-unit', "@layer-e2e", '@layer-integration'
  // Handles both single tag: { tag: '@layer-unit' }
  // and array tags:           { tag: ['@smoke', '@layer-unit'] }
  const layers = { unit: 0, integration: 0, e2e: 0, untagged: 0 };
  let taggedTests = 0;

  const layerTagRegex = /['"](@layer-unit|@layer-integration|@layer-e2e)['"]/g;
  let match;

  while ((match = layerTagRegex.exec(content)) !== null) {
    const layer = LAYER_TAGS[match[1]];
    if (layer) {
      layers[layer]++;
      taggedTests++;
    }
  }

  return { layers, taggedTests };
}

function classifyByFolder(filePath) {
  const parts = filePath.toLowerCase().split(path.sep);
  for (const part of parts) {
    if (FOLDER_MAP[part]) return FOLDER_MAP[part];
  }
  return null;
}

function countTestBlocks(content) {
  const testRegex = /^\s*(test|it)\s*\(/gm;
  return (content.match(testRegex) || []).length;
}

// ── Main scanner ──────────────────────────────────────────────────────────────

function scan(rootDir) {
  const files = walkDir(rootDir);

  if (files.length === 0) {
    return { error: `No test files found under: ${rootDir}` };
  }

  const summary = {
    counts:       { unit: 0, integration: 0, e2e: 0, untagged: 0 },
    total:        0,
    files:        [],
    rootDir,
    filesScanned: files.length,
    mode:         'unknown', // 'layer-tags' | 'folder' | 'mixed'
  };

  let filesWithLayerTags = 0;

  for (const filePath of files) {
    const content  = fs.readFileSync(filePath, 'utf8');
    const { layers, taggedTests } = classifyByLayerTag(content);
    const totalInFile = countTestBlocks(content);
    const untagged = Math.max(0, totalInFile - taggedTests);

    if (taggedTests > 0) filesWithLayerTags++;

    // Fallback: if no @layer-* tags found, try folder classification
    if (taggedTests === 0 && totalInFile > 0) {
      const folderLayer = classifyByFolder(filePath);
      if (folderLayer) {
        layers[folderLayer] += totalInFile;
      } else {
        layers.untagged += totalInFile;
      }
    } else {
      layers.untagged += untagged;
    }

    const fileTotal = layers.unit + layers.integration + layers.e2e + layers.untagged;
    if (fileTotal === 0) continue;

    for (const key of Object.keys(summary.counts)) {
      summary.counts[key] += layers[key];
    }
    summary.total += fileTotal;

    summary.files.push({
      name:   path.relative(rootDir, filePath),
      layers,
      total:  fileTotal,
    });
  }

  // Set classification mode for report context
  if (filesWithLayerTags === files.length)       summary.mode = 'layer-tags';
  else if (filesWithLayerTags === 0)             summary.mode = 'folder';
  else                                           summary.mode = 'mixed';

  return summary;
}

module.exports = { scan };
