#!/usr/bin/env ts-node
import { existsSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

const BLOCKED_EXTENSIONS = ['.pem', '.key', '.crt', '.p12'];
const BLOCKED_FILENAMES = ['.env', '.npmrc', '.ds_store'];
const BLOCKED_PATTERNS = [
	/(^|\/)coverage(\/|$)/i,
	/(^|\/)__snapshots__(\/|$)/i,
	/\.snap$/i,
	/(^|\/)test(\/|$)/i,
	/(^|\/)tests(\/|$)/i,
	/\.log$/i,
	/\.tmp$/i,
	/\.temp$/i,
	/\.swp$/i,
	/(^|\/)\.DS_Store$/i
];

function sha256(data) {
	return crypto.createHash('sha256').update(data).digest('hex');
}

function readPackageJson(workDir) {
	const pkgPath = join(workDir, 'package.json');
	if (!existsSync(pkgPath)) return null;
	return JSON.parse(readFileSync(pkgPath, 'utf8'));
}

function runNpmPack(workDir) {
	try {
		const output = execSync('npm pack --json', {
			cwd: workDir,
			env: { ...process.env, CI: 'true' },
			stdio: ['ignore', 'pipe', 'pipe']
		}).toString();
		const info = JSON.parse(output);
		const pack = Array.isArray(info) ? info[0] : info;
		const tarPath = join(workDir, pack.filename);
		const tarSize = existsSync(tarPath) ? statSync(tarPath).size : 0;
		const fileList = (pack.files || []).map((f) => {
			const p = String(f.path || '');
			return p.startsWith('package/') ? p.slice('package/'.length) : p;
		}).sort();
		const fileListHash = sha256(fileList.join('\n'));
		return { tarPath, tarSize, fileList, fileListHash };
	} catch (err) {
		const stdout = err && err.stdout ? err.stdout.toString() : '';
		const stderr = err && err.stderr ? err.stderr.toString() : '';
		if (stdout) console.error(stdout);
		if (stderr) console.error(stderr);
		throw new Error('npm pack failed');
	}
}

function pathMatchesBlocked(path) {
	const lower = path.toLowerCase();
	if (BLOCKED_FILENAMES.includes(lower)) return true;
	if (BLOCKED_EXTENSIONS.some(ext => lower.endsWith(ext))) return true;
	if (BLOCKED_PATTERNS.some(rx => rx.test(path))) return true;
	if (!process.env.SLOPGUARD_ALLOW_SOURCEMAP && lower.endsWith('.map')) return true;
	return false;
}

function validateExports(pkg, fileList) {
	const violations: string[] = [];
	const exportsField = pkg && pkg.exports ? pkg.exports : null;
	if (!exportsField) return violations;

	const checkTarget = (target) => {
		if (typeof target === 'string') {
			const normalized = target.replace(/^\.\//, '');
			if (!fileList.includes(normalized)) {
				violations.push(`Missing export target: ${target}`);
			}
		} else if (typeof target === 'object' && target !== null) {
			for (const v of Object.values(target)) checkTarget(v);
		}
	};

	checkTarget(exportsField);
	return violations;
}

function audit(workDir, maxSizeMb) {
	const pkg = readPackageJson(workDir);
	if (!pkg) {
		return {
			passed: false,
			filesInspected: 0,
			tarballSizeBytes: 0,
			secretsDetected: 0,
			unexpectedArtifacts: 0,
			exportViolations: 0,
			reasons: ['package.json not found']
		};
	}

	let pack;
	try {
		pack = runNpmPack(workDir);
	} catch (err) {
		return {
			passed: false,
			filesInspected: 0,
			tarballSizeBytes: 0,
			secretsDetected: 0,
			unexpectedArtifacts: 0,
			exportViolations: 0,
			reasons: [String((err && err.message) || 'npm pack failed')]
		};
	}
	const unexpected = pack.fileList.filter(pathMatchesBlocked);

	const exportViolations = validateExports(pkg, pack.fileList);

	// Secret detection by filename only (content scanning avoided for determinism)
	const secretsDetected = unexpected.filter(p => {
		const lower = p.toLowerCase();
		return lower.endsWith('.env') || lower.endsWith('.pem') || lower.endsWith('.key') || lower.endsWith('.crt') || lower.endsWith('.p12');
	}).length;

	const maxBytes = maxSizeMb * 1024 * 1024;
	const reasons: string[] = [];
	if (pack.tarSize > maxBytes) reasons.push(`Tarball size ${pack.tarSize} exceeds ${maxBytes} bytes`);
	if (unexpected.length) reasons.push(`Unexpected artifacts: ${unexpected.join(', ')}`);
	if (exportViolations.length) reasons.push(`Export violations: ${exportViolations.join(', ')}`);

	const passed = reasons.length === 0;
	return {
		passed,
		filesInspected: pack.fileList.length,
		tarballSizeBytes: pack.tarSize,
		secretsDetected,
		unexpectedArtifacts: unexpected.length,
		exportViolations: exportViolations.length,
		reasons,
		tarballPath: pack.tarPath
	};
}

function formatBytes(bytes) {
	const mb = bytes / (1024 * 1024);
	return `${mb.toFixed(2)}MB`;
}

function main() {
	try {
		const args = process.argv.slice(2);
		const workspaceArgIndex = args.indexOf('--workspace');
		const maxSizeArgIndex = args.indexOf('--max-size-mb');
		const repoRoot = workspaceArgIndex >= 0 ? resolve(args[workspaceArgIndex + 1]) : process.cwd();
		const maxSizeMb = maxSizeArgIndex >= 0 ? Number(args[maxSizeArgIndex + 1]) : 5;

		const result = audit(repoRoot, maxSizeMb);

		console.log(result.passed ? 'Package audit passed' : 'Package audit failed');
		console.log(`Files inspected: ${result.filesInspected}`);
		console.log(`Tarball size: ${formatBytes(result.tarballSizeBytes)}`);
		console.log(`Secrets detected: ${result.secretsDetected}`);
		console.log(`Unexpected artifacts: ${result.unexpectedArtifacts}`);
		console.log(`Export violations: ${result.exportViolations}`);
		if (result.tarballPath) console.log(`Tarball: ${result.tarballPath}`);
		if (!result.passed) {
			for (const r of result.reasons) console.error(r);
			process.exit(2);
		}
	} catch (err) {
		console.error('Package audit failed with error');
		if (err && err.stack) console.error(err.stack);
		else console.error(String(err));
		process.exit(1);
	}
}

main();
