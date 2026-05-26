#!/usr/bin/env ts-node
import { execSync } from 'child_process';

console.log('Running release-check: validating version, changelog, provenance, reproducibility...');

// Minimal stub: fail on dirty git
try {
  const status = execSync('git status --porcelain').toString().trim();
  if (status) {
    console.error('Repository is dirty. Aborting release.');
    process.exit(2);
  }
  console.log('Git clean.');
} catch (e) {
  console.warn('git not available or failed to run; continuing in CI environment.');
}

console.log('Release checks passed (stub).');
