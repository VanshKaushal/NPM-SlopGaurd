#!/usr/bin/env node
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, statSync, utimesSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, relative, resolve } from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

function log(...args: any[]) { console.log('[repro-check]', ...args); }

function copyWorkspaceTo(src: string, dest: string) {
	// Node 18+ supports cpSync recursive
	cpSync(src, dest, { recursive: true, force: true, dereference: true, filter: (srcPath) => {
		// Exclude node_modules and .git to keep a clean build
		const rel = srcPath.replace(src, '');
		if (rel.includes('node_modules') || rel.includes('.git')) return false;
		return true;
	}});
}

function runInDir(cmd: string, cwd: string, envOverride?: Record<string, string>) {
	log('> running:', cmd, 'in', cwd);
	const env = {
		...process.env,
		...envOverride,
		CI: 'true',
		TZ: process.env.TZ || 'UTC',
		LC_ALL: process.env.LC_ALL || 'C',
		SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH || '1700000000'
	};
	return execSync(cmd, { cwd, stdio: 'inherit', env });
}

function sha256(data: Buffer | string) {
	return crypto.createHash('sha256').update(data).digest('hex');
}

function collectArtifactFiles(root: string, exclude: string[] = []) {
	const files: string[] = [];
	function walk(p: string) {
		const entries = readdirSync(p);
		for (const e of entries) {
			const full = join(p, e);
			const rel = full.replace(root, '');
			if (exclude.some(ex => rel.includes(ex))) continue;
			const st = statSync(full);
			if (st.isDirectory()) walk(full);
			else if (st.isFile()) files.push(full);
		}
	}
	if (!existsSync(root)) return [];
	walk(root);
	return files.sort();
}

function computeArtifactsDigest(root: string, exclude: string[] = []) {
	const files = collectArtifactFiles(root, exclude);
	const parts: string[] = [];
	for (const f of files) {
		const rel = relative(root, f).replace(/\\/g, '/');
		const content = readFileSync(f);
		const h = sha256(content);
		const size = statSync(f).size;
		// normalize metadata: path + size + sha
		parts.push(`${rel}:${size}:${h}`);
	}
	return sha256(parts.join('\n'));
}

function makeTempDir(prefix = 'slopguard-repro-') {
	return mkdtempSync(join(tmpdir(), prefix));
}

function readPackageJson(workDir: string) {
	try {
		return JSON.parse(readFileSync(join(workDir, 'package.json'), 'utf8'));
	} catch {
		return null;
	}
}

function hasScript(workDir: string, scriptName: string) {
	const pkg = readPackageJson(workDir);
	return !!(pkg && pkg.scripts && pkg.scripts[scriptName]);
}

function collectPackageFiles(workDir: string, filesList: string[]) {
	const collected: string[] = [];
	for (const entry of filesList) {
		const full = join(workDir, entry);
		if (!existsSync(full)) continue;
		const st = statSync(full);
		if (st.isFile()) collected.push(full);
		if (st.isDirectory()) {
			const inner = collectArtifactFiles(full, ['node_modules', '.git']);
			collected.push(...inner);
		}
	}
	return collected.sort();
}

function computePackageFilesDigest(workDir: string, filesList: string[]) {
	const files = collectPackageFiles(workDir, filesList);
	const parts = files.map(f => {
		const rel = relative(workDir, f).replace(/\\/g, '/');
		const h = sha256(readFileSync(f));
		const size = statSync(f).size;
		return `${rel}:${size}:${h}`;
	});
	return sha256(parts.join('\n'));
}

function envHash(env: Record<string, string | undefined>) {
	const keys = ['TZ', 'LC_ALL', 'LANG', 'NODE_ENV', 'SOURCE_DATE_EPOCH', 'SLOPGUARD_REPRO_ENV', 'SLOPGUARD_REPRO_ATTACK'];
	const parts = keys.map((key) => `${key}=${env[key] ?? ''}`).sort();
	return sha256(parts.join('\n'));
}

function runNpmPack(workDir: string, envOverride?: Record<string, string>) {
	const output = execSync('npm pack --json', { cwd: workDir, env: { ...process.env, ...envOverride, CI: 'true' } }).toString();
	const info = JSON.parse(output);
	const pack = Array.isArray(info) ? info[0] : info;
	const tarPath = join(workDir, pack.filename);
	const tarHash = sha256(readFileSync(tarPath));
	const fileList = (pack.files || []).map((f: any) => f.path).sort();
	const fileListHash = sha256(fileList.join('\n'));
	return { tarPath, tarHash, fileListHash, fileCount: fileList.length };
}

function buildAndHash(workDir: string, envOverride?: Record<string, string>) {
	// install deps
	if (process.env.SLOPGUARD_SKIP_INSTALL !== '1') {
		try { runInDir('npm ci --prefer-offline --no-audit --progress=false', workDir, envOverride); } catch (e) { log('npm ci failed:', e); }
	} else {
		log('Skipping npm ci due to SLOPGUARD_SKIP_INSTALL=1');
	}
	// run build if present
	if (hasScript(workDir, 'build')) {
		runInDir('npm run build --if-present', workDir, envOverride);
	} else if (existsSync(join(workDir, 'tsconfig.json'))) {
		try { runInDir('npx tsc -b', workDir, envOverride); } catch {}
	} else {
		log('No build script or tsconfig found; skipping build step');
	}

	// Determine artifact root: prefer dist/, otherwise package "files" or fallback to .
	let artifactRoot = join(workDir, 'dist');
	let artifactDigest = '';
	const pkg = readPackageJson(workDir);
	if (existsSync(artifactRoot)) {
		artifactDigest = computeArtifactsDigest(artifactRoot, ['node_modules', '.git']);
	} else if (pkg && Array.isArray(pkg.files) && pkg.files.length) {
		artifactRoot = workDir;
		artifactDigest = computePackageFilesDigest(workDir, pkg.files);
	} else {
		artifactRoot = workDir;
		artifactDigest = computeArtifactsDigest(artifactRoot, ['node_modules', '.git']);
	}

	// compute tarball and file list hashes
	const pack = runNpmPack(workDir, envOverride);

	// lockfile hash
	const lockFiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
	const lockHashes: Record<string, string> = {};
	for (const lf of lockFiles) {
		const p = join(workDir, lf);
		if (existsSync(p)) lockHashes[lf] = sha256(readFileSync(p));
	}

	// package.json hash
	const pkgHash = existsSync(join(workDir, 'package.json')) ? sha256(readFileSync(join(workDir, 'package.json'))) : '';
	const currentEnvHash = envHash({ ...process.env, ...envOverride });

	return {
		artifactRoot,
		artifactDigest,
		tarHash: pack.tarHash,
		tarPath: pack.tarPath,
		packFileListHash: pack.fileListHash,
		packFileCount: pack.fileCount,
		lockHashes,
		pkgHash,
		envHash: currentEnvHash
	};
}

type Attack = 'timestamp' | 'env' | 'lockfile' | 'file-order' | 'path-separators';

function applyAttacks(workDir: string, attacks: Attack[]) {
	const attackStamp = process.env.SLOPGUARD_REPRO_ATTACK_STAMP || 'attack';
	if (attacks.includes('timestamp')) {
		const files = collectArtifactFiles(workDir, ['node_modules', '.git']);
		const now = Date.now();
		for (const f of files) {
			try {
				const delta = parseInt(sha256(f).slice(0, 8), 16) % 10000;
				const time = new Date(now + delta);
				utimesSync(f, time, time);
			} catch {
				continue;
			}
		}
	}

	if (attacks.includes('lockfile')) {
		const lockFiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
		for (const lf of lockFiles) {
			const p = join(workDir, lf);
			if (!existsSync(p)) continue;
			try {
				if (lf === 'package-lock.json') {
					const json = JSON.parse(readFileSync(p, 'utf8'));
					json['x-attack'] = `lockfile-${attackStamp}`;
					writeFileSync(p, JSON.stringify(json, null, 2));
				} else {
					writeFileSync(p, `${readFileSync(p, 'utf8')}\n# attack:${attackStamp}`);
				}
			} catch {
				continue;
			}
		}
	}

	if (attacks.includes('file-order')) {
		const pkgPath = join(workDir, 'package.json');
		if (existsSync(pkgPath)) {
			try {
				const json = JSON.parse(readFileSync(pkgPath, 'utf8'));
				if (Array.isArray(json.files)) {
					json.files = [...json.files].reverse();
					writeFileSync(pkgPath, JSON.stringify(json, null, 2));
				}
			} catch {
				// ignore
			}
		}
	}

	if (attacks.includes('path-separators')) {
		const pkgPath = join(workDir, 'package.json');
		if (existsSync(pkgPath)) {
			try {
				const json = JSON.parse(readFileSync(pkgPath, 'utf8'));
				if (Array.isArray(json.files)) {
					json.files = json.files.map((entry: string) => entry.replace(/\//g, '\\'));
					writeFileSync(pkgPath, JSON.stringify(json, null, 2));
				}
			} catch {
				// ignore
			}
		}
	}
}

function parseAttacks(args: string[]): Attack[] {
	const attacks: Attack[] = [];
	for (let i = 0; i < args.length; i += 1) {
		if (args[i] === '--attack') {
			const value = args[i + 1];
			if (!value) continue;
			const list = value.split(',').map((v) => v.trim()) as Attack[];
			for (const v of list) {
				if (['timestamp', 'env', 'lockfile', 'file-order', 'path-separators'].includes(v)) {
					attacks.push(v);
				}
			}
		}
	}
	return Array.from(new Set(attacks));
}

async function main() {
	const args = process.argv.slice(2);
	const workspaceArgIndex = args.indexOf('--workspace');
	const attacks = parseAttacks(args);
	const repoRoot = workspaceArgIndex >= 0 ? resolve(args[workspaceArgIndex + 1]) : process.cwd();
	log('Starting reproducibility check from', repoRoot);
	if (attacks.length) log('Attacks enabled:', attacks.join(', '));

	const src1 = makeTempDir();
	const src2 = makeTempDir();
	log('Created temp dirs:', src1, src2);

	// Copy workspace into temp dirs
	copyWorkspaceTo(repoRoot, src1);
	copyWorkspaceTo(repoRoot, src2);
	if (attacks.length) applyAttacks(src2, attacks);

	// Build and hash in each
	log('Building first copy...');
	const r1 = buildAndHash(src1);
	log('First build artifact digest:', r1.artifactDigest);
	log('First build tar hash:', r1.tarHash);
	log('First build tar path:', r1.tarPath);

	log('Cleaning second copy and building...');
	const envOverride = attacks.includes('env') ? { SLOPGUARD_REPRO_ENV: `attack-${process.env.SLOPGUARD_REPRO_ATTACK_STAMP || 'attack'}` } : undefined;
	const r2 = buildAndHash(src2, envOverride);
	log('Second build artifact digest:', r2.artifactDigest);
	log('Second build tar hash:', r2.tarHash);
	log('Second build tar path:', r2.tarPath);

	const matches = [
		r1.artifactDigest === r2.artifactDigest,
		r1.tarHash === r2.tarHash,
		r1.packFileListHash === r2.packFileListHash,
		r1.pkgHash === r2.pkgHash,
		JSON.stringify(r1.lockHashes) === JSON.stringify(r2.lockHashes),
		r1.envHash === r2.envHash
	];

	if (matches.every(Boolean)) {
		console.log('REPRODUCIBILITY VERIFIED');
		console.log('Hash Drift: NONE');
		console.log('Tarball Drift: NONE');
		console.log('Digest Stability: VERIFIED');
		console.log('Environment Stability: VERIFIED');
		process.exit(0);
	} else {
		console.error('REPRODUCIBILITY FAILED');
		console.error('Hash Drift:', r1.artifactDigest === r2.artifactDigest ? 'NONE' : 'DETECTED');
		console.error('Tarball Drift:', r1.tarHash === r2.tarHash ? 'NONE' : 'DETECTED');
		console.error('Digest Stability:', r1.packFileListHash === r2.packFileListHash ? 'VERIFIED' : 'FAILED');
		console.error('Environment Stability:', r1.envHash === r2.envHash ? 'VERIFIED' : 'FAILED');
		console.error('first:', r1);
		console.error('second:', r2);
		process.exit(2);
	}
}

main().catch((err) => { console.error(err); process.exit(3); });
