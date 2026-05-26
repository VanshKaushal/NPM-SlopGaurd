#!/usr/bin/env ts-node
import { copyFileSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync, spawnSync } from 'child_process';
import { pathToFileURL } from 'url';

function log(...args: any[]) { console.log('[smoke-test]', ...args); }

function run(cmd: string, cwd?: string, envOverride?: Record<string, string>) {
	log('> running:', cmd);
	const result = spawnSync(cmd, {
		cwd: cwd ?? process.cwd(),
		shell: true,
		encoding: 'utf8',
		env: { ...process.env, CI: 'true', ...envOverride }
	});
	if (result.error) throw result.error;
	return result;
}

function runNode(args: string[], cwd?: string, envOverride?: Record<string, string>) {
	log('> running: node', args.join(' '));
	const result = spawnSync(process.execPath, args, {
		cwd: cwd ?? process.cwd(),
		encoding: 'utf8',
		env: { ...process.env, CI: 'true', ...envOverride }
	});
	if (result.error) throw result.error;
	return result;
}

function runCommand(command: string, args: string[], cwd?: string, envOverride?: Record<string, string>) {
	log('> running:', command, args.join(' '));
	const result = spawnSync(command, args, {
		cwd: cwd ?? process.cwd(),
		encoding: 'utf8',
		env: { ...process.env, CI: 'true', ...envOverride }
	});
	if (result.error) throw result.error;
	return result;
}

function runNpx(args: string[], cwd?: string) {
	if (process.platform === 'win32') {
		log('> running: npx', args.join(' '));
		const result = spawnSync('npx', args, {
			cwd: cwd ?? process.cwd(),
			encoding: 'utf8',
			env: { ...process.env, CI: 'true' },
			shell: true
		});
		if (result.error) throw result.error;
		return result;
	}
	return runCommand('npx', args, cwd);
}

function assertExit(label: string, result: { status: number | null; stdout?: string; stderr?: string }) {
	if (result.status === 0 || result.status === 1 || result.status === 2) return;
	const out = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
	throw new Error(`${label} command failed with exit code ${result.status}\n${out}`);
}

function buildAndPack() {
	if (process.env.SLOPGUARD_SKIP_BUILD !== '1') {
		execSync('npm run build --if-present', { stdio: 'inherit' });
	} else {
		log('Skipping build due to SLOPGUARD_SKIP_BUILD=1');
	}
	const out = execSync('npm pack --json', { stdio: 'pipe' }).toString();
	const info = JSON.parse(out);
	const pack = Array.isArray(info) ? info[0] : info;
	const tarball = pack.filename;
	return tarball;
}

function createFixtureWorkspace() {
	const dir = mkdtempSync(join(tmpdir(), 'slopguard-smoke-'));
	const pkg = {
		name: 'slopguard-smoke-fixture',
		version: '1.0.0',
		type: 'module',
		dependencies: { react: '18.2.0' }
	};
	writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
	return dir;
}

function assertContains(label: string, output: string, patterns: RegExp[]) {
	for (const rx of patterns) {
		if (!rx.test(output)) {
			const trimmed = output.trim();
			throw new Error(`${label} missing expected output: ${rx}\nOutput:\n${trimmed}`);
		}
	}
}

function main() {
	log('Starting smoke tests');
	const repoRoot = process.cwd();
	const useTs = process.env.SLOPGUARD_SMOKE_USE_TS === '1';
	let tarball: string | null = null;
	if (!useTs) {
		tarball = buildAndPack();
		tarball = join(repoRoot, tarball);
		log('Packed tarball:', tarball);
	} else {
		log('Using ts-node CLI execution due to SLOPGUARD_SMOKE_USE_TS=1');
	}

	const fixture = createFixtureWorkspace();
	log('Fixture workspace:', fixture);
	if (tarball) {
		const localTar = join(fixture, 'slopguard.tgz');
		copyFileSync(tarball, localTar);
		tarball = localTar;
		log('Copied tarball to fixture:', tarball);
	}

	// 1) npx slopguard check react
	const loaderPath = join(repoRoot, 'node_modules', 'ts-node', 'esm.mjs');
	const loaderUrl = pathToFileURL(loaderPath).href;
	const cliUrl = pathToFileURL(join(repoRoot, 'src', 'cli.ts')).href;
	const tsEnv = {
		TS_NODE_FILES: 'true',
		TS_NODE_TRANSPILE_ONLY: 'true',
		NODE_PATH: join(repoRoot, 'node_modules')
	};
	const tsRunner = (args: string[]) => {
		const chdir = JSON.stringify(fixture);
		const importPath = JSON.stringify(cliUrl);
		const argv = JSON.stringify(['node', 'cli', ...args]);
		const evalCode = `process.argv = ${argv}; process.chdir(${chdir}); import(${importPath});`;
		return runNode(['--loader', loaderUrl, '-e', evalCode], repoRoot, tsEnv);
	};
	const tarballSpec = tarball ? `file:${tarball}` : '';
	const check = useTs
		? tsRunner(['check', 'react'])
		: runNpx(['--yes', tarballSpec, 'check', 'react'], fixture);
	const checkOut = `${check.stdout}\n${check.stderr}`;
	assertExit('check', check);
	assertContains('check', checkOut, [/confidence/i, /reasons/i]);

	// 2) npx slopguard scan
	const scan = useTs
		? tsRunner(['scan'])
		: runNpx(['--yes', tarballSpec, 'scan'], fixture);
	const scanOut = `${scan.stdout}\n${scan.stderr}`;
	assertExit('scan', scan);
	assertContains('scan', scanOut, [/react/i, /confidence/i, /reasons/i]);

	// 3) npx slopguard install lodash --dry-run
	const install = useTs
		? tsRunner(['install', 'lodash', '--dry-run'])
		: runNpx(['--yes', tarballSpec, 'install', 'lodash', '--dry-run'], fixture);
	const installOut = `${install.stdout}\n${install.stderr}`;
	assertExit('install', install);
	assertContains('install', installOut, [/Dry run: install skipped/i, /policy/i, /decision/i, /confidence/i]);

	log('Smoke tests passed');
}

main();
