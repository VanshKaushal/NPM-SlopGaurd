#!/usr/bin/env ts-node
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

type IntegrityResult = {
	passed: boolean;
	tarballPath?: string;
	tarballSha256?: string;
	provenanceVerified: boolean;
	reasons: string[];
};

function sha256(data: Buffer | string) {
	return crypto.createHash('sha256').update(data).digest('hex');
}

function runNpmPack(workDir: string) {
	const output = execSync('npm pack --json', {
		cwd: workDir,
		env: { ...process.env, CI: 'true' },
		stdio: ['ignore', 'pipe', 'pipe']
	}).toString();
	const info = JSON.parse(output);
	const pack = Array.isArray(info) ? info[0] : info;
	const tarPath = join(workDir, pack.filename);
	return tarPath;
}

function parseProvenance(provenancePath: string) {
	const raw = readFileSync(provenancePath, 'utf8');
	return JSON.parse(raw);
}

function verifyProvenance(provenance: any, tarballSha: string) {
	if (!provenance || !Array.isArray(provenance.subject)) return false;
	for (const subject of provenance.subject) {
		const digest = subject?.digest?.sha256;
		if (typeof digest === 'string' && digest === tarballSha) return true;
	}
	return false;
}

function integrityCheck(workDir: string, expectedSha?: string, provenanceFile?: string, requireProvenance?: boolean): IntegrityResult {
	const reasons: string[] = [];
	let tarballPath: string | undefined;
	let tarballSha: string | undefined;
	let provenanceVerified = false;

	try {
		tarballPath = runNpmPack(workDir);
		if (!existsSync(tarballPath)) {
			reasons.push('tarball not found after npm pack');
		} else {
			tarballSha = sha256(readFileSync(tarballPath));
		}
	} catch (err: any) {
		reasons.push(`npm pack failed: ${String(err?.message || err)}`);
	}

	if (expectedSha && tarballSha && expectedSha !== tarballSha) {
		reasons.push(`tarball hash mismatch: expected ${expectedSha} got ${tarballSha}`);
	}

	if (provenanceFile) {
		if (!existsSync(provenanceFile)) {
			reasons.push(`provenance file missing: ${provenanceFile}`);
		} else if (tarballSha) {
			const provenance = parseProvenance(provenanceFile);
			provenanceVerified = verifyProvenance(provenance, tarballSha);
			if (!provenanceVerified) reasons.push('provenance verification failed');
		}
	} else if (requireProvenance) {
		reasons.push('provenance required but no file provided');
	}

	return {
		passed: reasons.length === 0,
		tarballPath,
		tarballSha256: tarballSha,
		provenanceVerified: provenanceVerified || !requireProvenance,
		reasons
	};
}

function main() {
	const args = process.argv.slice(2);
	const workspaceArgIndex = args.indexOf('--workspace');
	const expectedArgIndex = args.indexOf('--expected-sha');
	const provenanceArgIndex = args.indexOf('--provenance-file');
	const requireProvenance = args.includes('--require-provenance');

	const repoRoot = workspaceArgIndex >= 0 ? resolve(args[workspaceArgIndex + 1]) : process.cwd();
	const expectedSha = expectedArgIndex >= 0 ? args[expectedArgIndex + 1] : undefined;
	const provenanceFile = provenanceArgIndex >= 0 ? resolve(args[provenanceArgIndex + 1]) : undefined;

	const result = integrityCheck(repoRoot, expectedSha, provenanceFile, requireProvenance);

	console.log(result.passed ? 'Integrity verification passed' : 'Integrity verification failed');
	if (result.tarballSha256) console.log(`Artifact hash: SHA256:${result.tarballSha256}`);
	if (result.tarballPath) console.log(`Tarball: ${result.tarballPath}`);
	console.log(`Provenance: ${result.provenanceVerified ? 'VERIFIED' : 'MISSING'}`);

	if (!result.passed) {
		for (const r of result.reasons) console.error(r);
		process.exit(2);
	}
}

main();
