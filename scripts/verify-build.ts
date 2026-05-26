#!/usr/bin/env ts-node
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

function sha256(data: Buffer | string) { return crypto.createHash('sha256').update(data).digest('hex'); }

function computeDirDigest(dir: string) {
	// Reuse logic from reproducibility-check where possible; here we perform a simple check for dist/ existence
	if (!existsSync(dir)) {
		console.error('Expected build output not found at', dir);
		process.exit(2);
	}
	// compute a naive digest of file names and contents
	const walk = (p: string) => {
		const list: string[] = [];
		function w(cur: string) {
			for (const e of readdirSync(cur)) {
				const full = join(cur, e);
				const st = statSync(full);
				if (st.isDirectory()) w(full);
				else list.push(full);
			}
		}
		w(p);
		return list.sort();
	};
	const files = walk(dir);
	const parts = files.map((f: string) => {
		const rel = f.replace(dir + '/', '');
		const c = readFileSync(f);
		return `${rel}:${sha256(c)}`;
	});
	return sha256(parts.join('\n'));
}

function runBuild(cwd: string) {
	if (process.env.SLOPGUARD_SKIP_INSTALL !== '1') {
		try { execSync('npm ci --prefer-offline --no-audit --progress=false', { stdio: 'inherit', cwd }); } catch (e) { console.warn('npm ci may have failed'); }
	} else {
		console.log('Skipping npm ci due to SLOPGUARD_SKIP_INSTALL=1');
	}
	try { execSync('npm run build --if-present', { stdio: 'inherit', cwd }); } catch (e) { console.warn('build script failed or not present'); }
}

function main() {
	const args = process.argv.slice(2);
	const workspaceArgIndex = args.indexOf('--workspace');
	const repoRoot = workspaceArgIndex >= 0 ? resolve(args[workspaceArgIndex + 1]) : process.cwd();
	console.log('verify-build: running build and producing digest for dist/ in', repoRoot);
	runBuild(repoRoot);
	const digest = computeDirDigest(join(repoRoot, 'dist'));
	console.log('Build digest:', digest);
	// Optionally write digest to file for CI comparison
	try { writeFileSync(join(repoRoot, 'build.digest'), digest); console.log('Wrote build.digest'); } catch {}
}

main();
