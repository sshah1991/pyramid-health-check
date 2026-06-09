#!/usr/bin/env node
'use strict';

const { run } = require('../src/agent');

run().catch(err => {
  console.error('\n[pyramid-health] Fatal error:', err.message);
  process.exit(1);
});
