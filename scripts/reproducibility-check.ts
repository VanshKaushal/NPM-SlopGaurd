#!/usr/bin/env ts-node
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'fs';
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

function runInDir(cmd: string, cwd: string) {
	log('> running:', cmd, 'in', cwd);
	const env = {
		...process.env,
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

function runNpmPack(workDir: string) {
	const output = execSync('npm pack --json', { cwd: workDir, env: { ...process.env, CI: 'true' } }).toString();
	const info = JSON.parse(output);
	const pack = Array.isArray(info) ? info[0] : info;
	const tarPath = join(workDir, pack.filename);
	const tarHash = sha256(readFileSync(tarPath));
	const fileList = (pack.files || []).map((f: any) => f.path).sort();
	const fileListHash = sha256(fileList.join('\n'));
	return { tarPath, tarHash, fileListHash, fileCount: fileList.length };
}

function buildAndHash(workDir: string) {
	// install deps
	if (process.env.SLOPGUARD_SKIP_INSTALL !== '1') {
		try { runInDir('npm ci --prefer-offline --no-audit --progress=false', workDir); } catch (e) { log('npm ci failed:', e); }
	} else {
		log('Skipping npm ci due to SLOPGUARD_SKIP_INSTALL=1');
	}
	// run build if present
	if (hasScript(workDir, 'build')) {
		runInDir('npm run build --if-present', workDir);
	} else if (existsSync(join(workDir, 'tsconfig.json'))) {
		try { runInDir('npx tsc -b', workDir); } catch {}
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
	const pack = runNpmPack(workDir);

	// lockfile hash
	const lockFiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
	const lockHashes: Record<string, string> = {};
	for (const lf of lockFiles) {
		const p = join(workDir, lf);
		if (existsSync(p)) lockHashes[lf] = sha256(readFileSync(p));
	}

	// package.json hash
	const pkgHash = existsSync(join(workDir, 'package.json')) ? sha256(readFileSync(join(workDir, 'package.json'))) : '';

	return {
		artifactRoot,
		artifactDigest,
		tarHash: pack.tarHash,
		tarPath: pack.tarPath,
		packFileListHash: pack.fileListHash,
		packFileCount: pack.fileCount,
		lockHashes,
		pkgHash
	};
}

async function main() {
	const args = process.argv.slice(2);
	const workspaceArgIndex = args.indexOf('--workspace');
	const repoRoot = workspaceArgIndex >= 0 ? resolve(args[workspaceArgIndex + 1]) : process.cwd();
	log('Starting reproducibility check from', repoRoot);

	const src1 = makeTempDir();
	const src2 = makeTempDir();
	log('Created temp dirs:', src1, src2);

	// Copy workspace into temp dirs
	copyWorkspaceTo(repoRoot, src1);
	copyWorkspaceTo(repoRoot, src2);

	// Build and hash in each
	log('Building first copy...');
	const r1 = buildAndHash(src1);
	log('First build artifact digest:', r1.artifactDigest);
	log('First build tar hash:', r1.tarHash);
	log('First build tar path:', r1.tarPath);

	log('Cleaning second copy and building...');
	const r2 = buildAndHash(src2);
	log('Second build artifact digest:', r2.artifactDigest);
	log('Second build tar hash:', r2.tarHash);
	log('Second build tar path:', r2.tarPath);

	const matches = [
		r1.artifactDigest === r2.artifactDigest,
		r1.tarHash === r2.tarHash,
		r1.packFileListHash === r2.packFileListHash,
		r1.pkgHash === r2.pkgHash,
		JSON.stringify(r1.lockHashes) === JSON.stringify(r2.lockHashes)
	];

	if (matches.every(Boolean)) {
		log('Reproducibility check PASSED — artifact digests match');
		process.exit(0);
	} else {
		console.error('Reproducibility check FAILED — artifact digests differ');
		console.error('first:', r1);
		console.error('second:', r2);
		process.exit(2);
	}
}

main().catch((err) => { console.error(err); process.exit(3); });
