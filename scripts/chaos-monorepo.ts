#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const slopguardBin = path.join(rootDir, 'dist', 'src', 'cli.js');

function makeTempDir(prefix: string) {
	return fs.mkdtempSync(path.join(tmpdir(), prefix));
}

function runSlopguard(cwd: string) {
	return spawnSync(process.execPath, [slopguardBin, 'scan'], { cwd, encoding: 'utf8' });
}

function testHostileLockfiles() {
	console.log('HOSTILE LOCKFILE WARFARE\n');
	const testDir = makeTempDir('slopguard-hostile-');

	// 1. Malformed package-lock.json
	const malformedJsonDir = path.join(testDir, 'malformed-json');
	fs.mkdirSync(malformedJsonDir);
	fs.writeFileSync(path.join(malformedJsonDir, 'package.json'), JSON.stringify({ name: "bad" }));
	fs.writeFileSync(path.join(malformedJsonDir, 'package-lock.json'), '{ "name": "bad", "dependencies": { "a": "1.0.0", }'); // invalid trailing comma
	
	const resJson = runSlopguard(malformedJsonDir);
	console.log(`Malformed JSON parsing: ${resJson.status !== 0 ? 'DETERMINISTIC FAILURE (PASS)' : 'CRITICAL BUG: Ignored parse error'}`);

	// 2. Cyclic Workspace References
	const cyclicDir = path.join(testDir, 'cyclic-workspaces');
	fs.mkdirSync(cyclicDir);
	fs.writeFileSync(path.join(cyclicDir, 'package.json'), JSON.stringify({
		name: "cyclic",
		workspaces: ["packages/*"]
	}));
	fs.mkdirSync(path.join(cyclicDir, 'packages', 'a'), { recursive: true });
	fs.mkdirSync(path.join(cyclicDir, 'packages', 'b'), { recursive: true });
	fs.writeFileSync(path.join(cyclicDir, 'packages', 'a', 'package.json'), JSON.stringify({ name: "a", dependencies: { "b": "workspace:*" } }));
	fs.writeFileSync(path.join(cyclicDir, 'packages', 'b', 'package.json'), JSON.stringify({ name: "b", dependencies: { "a": "workspace:*" } }));
	
	const resCyclic = runSlopguard(cyclicDir);
	console.log(`Cyclic Workspace Handling: ${resCyclic.status === 0 || resCyclic.status === 1 ? 'SAFE EXIT (PASS)' : 'CRASH/HANG'}`);

	// 3. Truncated pnpm-lock.yaml
	const truncatedYamlDir = path.join(testDir, 'truncated-yaml');
	fs.mkdirSync(truncatedYamlDir);
	fs.writeFileSync(path.join(truncatedYamlDir, 'package.json'), JSON.stringify({ name: "trunc" }));
	fs.writeFileSync(path.join(truncatedYamlDir, 'pnpm-lock.yaml'), 'lockfileVersion: "6.0"\npackages:\n  /foo/1.0.0:\n'); // incomplete
	
	const resYaml = runSlopguard(truncatedYamlDir);
	console.log(`Truncated YAML Parsing: ${resYaml.status !== 0 ? 'DETERMINISTIC FAILURE (PASS)' : 'CRITICAL BUG: Ignored parse error'}`);

	console.log('\nHostile Lockfile Warfare Validation Complete.');
}

testHostileLockfiles();
