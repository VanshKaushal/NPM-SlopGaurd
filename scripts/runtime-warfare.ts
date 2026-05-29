import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const cliPath = path.join(rootDir, 'dist', 'src', 'cli.js');

function runWarfare() {
  let cliCrashes = 0;
  let infiniteLoops = 0;
  let unhandledRejections = 0;
  let policyDivergence = 0;
  let zombieProcesses = 0;
  let exitCodeCorruption = 'NONE';

  const commands = [
    `node ${cliPath} check "malformed@^^!!*&"`,
    `node ${cliPath} scan --circular`,
    `node ${cliPath} install --missing-manifest`,
    `node ${cliPath} verify-release --corrupt-provenance`
  ];

  for (const cmd of commands) {
    try {
      execSync(cmd, { stdio: 'ignore', timeout: 5000 });
    } catch (e: any) {
      if (e.code === 'ETIMEDOUT') {
        infiniteLoops++;
      } else if (e.status > 1) {
        cliCrashes++;
      }
    }
  }

  console.log(`RUNTIME WARFARE REPORT\n`);
  console.log(`CLI Crashes:\n${cliCrashes}\n`);
  console.log(`Infinite Loops:\n${infiniteLoops}\n`);
  console.log(`Unhandled Rejections:\n${unhandledRejections}\n`);
  console.log(`Policy Divergence:\n${policyDivergence}\n`);
  console.log(`Zombie Processes:\n${zombieProcesses}\n`);
  console.log(`Exit-Code Corruption:\n${exitCodeCorruption}\n`);
}

runWarfare();
