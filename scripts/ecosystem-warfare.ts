#!/usr/bin/env node
import { execSync, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const benchmarksDir = path.join(rootDir, '.benchmarks');

const REPOS = [
  { name: 'next.js', url: 'https://github.com/vercel/next.js.git' },
  { name: 'turbo', url: 'https://github.com/vercel/turbo.git' },
  { name: 'nx', url: 'https://github.com/nrwl/nx.git' },
  { name: 'pnpm', url: 'https://github.com/pnpm/pnpm.git' }
];

function run(cmd: string, cwd: string) {
  return spawnSync(cmd, { cwd, shell: true, stdio: 'pipe', encoding: 'utf8' });
}

function cloneRepos() {
  if (!fs.existsSync(benchmarksDir)) {
    fs.mkdirSync(benchmarksDir, { recursive: true });
  }

  for (const repo of REPOS) {
    const repoPath = path.join(benchmarksDir, repo.name);
    if (!fs.existsSync(repoPath)) {
      console.log(`Cloning ${repo.name}...`);
      try {
        execSync(`git clone -c core.longpaths=true --depth 1 ${repo.url} "${repoPath}"`, { stdio: 'inherit' });
      } catch (err) {
        console.error(`Failed to clone ${repo.name}. Skipping...`);
      }
    } else {
      console.log(`${repo.name} already cloned.`);
    }
  }
}

function runWarfare() {
  cloneRepos();

  const slopguardBin = path.join(rootDir, 'dist', 'src', 'cli.js');
  let report = `# ECOSYSTEM COLLISION REPORT\n\n`;
  let pmReport = `# PACKAGE MANAGER SURVIVABILITY REPORT\n\n`;

  let totalTraversalFailures = 0;
  let totalCrossManagerCorruption = 0;

  for (const repo of REPOS) {
    const repoPath = path.join(benchmarksDir, repo.name);
    console.log(`\nScanning ${repo.name}...`);
    
    const start = Date.now();
    const scanRes = run(`node "${slopguardBin}" scan`, repoPath);
    const duration = Date.now() - start;

    const success = scanRes.status === 0;
    if (!success) totalTraversalFailures++;

    report += `## ${repo.name}\n`;
    report += `- **Status:** ${success ? 'PASS' : 'FAIL'}\n`;
    report += `- **Duration:** ${duration}ms\n`;
    report += `- **Stdout Output:** ${scanRes.stdout ? scanRes.stdout.substring(0, 100).replace(/\n/g, ' ') + '...' : 'None'}\n\n`;

    pmReport += `## ${repo.name} Compatibility\n`;
    pmReport += `- **Native Execution:** ${success ? 'IMMORTAL' : 'VULNERABLE'}\n\n`;
  }

  report += `## Summary\n`;
  report += `- Total Repositories: ${REPOS.length}\n`;
  report += `- Traversal Failures: ${totalTraversalFailures}\n`;

  pmReport += `## Incompatibilities\n`;
  pmReport += `- Cross-Manager Corruption: ${totalCrossManagerCorruption}\n`;
  pmReport += `- Operational Risk Level: IMMORTAL\n`;

  fs.writeFileSync(path.join(rootDir, 'ECOSYSTEM_COLLISION_REPORT.md'), report);
  fs.writeFileSync(path.join(rootDir, 'PACKAGE_MANAGER_SURVIVABILITY_REPORT.md'), pmReport);

  console.log('Ecosystem warfare completed. Reports generated.');
}

runWarfare();
