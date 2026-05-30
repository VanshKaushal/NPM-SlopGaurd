#!/usr/bin/env node
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

type IntegrityResult = {
	passed: boolean;
	tarballPath?: string;
	tarballSha256?: string;
	provenanceVerified: boolean;
	provenanceSignatureVerified: boolean;
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
	let envelope, rawPayload, payloadType;
	try {
		envelope = JSON.parse(raw);
		if (envelope.payload) {
			payloadType = envelope.payloadType || 'application/vnd.in-toto+json';
			rawPayload = Buffer.from(envelope.payload, 'base64').toString('utf8');
		} else {
			// Legacy fallback
			envelope = null;
			rawPayload = raw;
			payloadType = '';
		}
	} catch {
		envelope = null;
		rawPayload = raw;
		payloadType = '';
	}
	return { envelope, rawPayload, payloadType, json: JSON.parse(rawPayload) };
}

function verifyProvenance(provenance: any, tarballSha: string, tarballName: string) {
	if (!provenance || !Array.isArray(provenance.subject)) return false;
	const subjectMatch = provenance.subject.some((subject: any) => {
		const digest = subject?.digest?.sha256;
		const name = subject?.name;
		return typeof digest === 'string' && digest === tarballSha && typeof name === 'string' && name.endsWith(tarballName);
	});
	if (!subjectMatch) return false;
	if (typeof provenance.predicateType !== 'string') return false;
	return true;
}

function parseSignature(signaturePath?: string) {
	if (!signaturePath) return null;
	if (!existsSync(signaturePath)) return null;
	const raw = readFileSync(signaturePath);
	const text = raw.toString('utf8').trim();
	if (/^[A-Za-z0-9+/=]+$/.test(text)) return Buffer.from(text, 'base64');
	return raw;
}

function verifySignature(rawPayload: string, payloadType: string, signature: Buffer, publicKeyPath: string) {
	if (!existsSync(publicKeyPath)) return false;
	const publicKey = readFileSync(publicKeyPath, 'utf8');
	
	let data;
	if (payloadType) {
		const pae = `DSSEv1 ${payloadType.length} ${payloadType} ${Buffer.byteLength(rawPayload)} ${rawPayload}`;
		data = Buffer.from(pae, 'utf8');
	} else {
		// Legacy
		data = Buffer.from(rawPayload, 'utf8');
	}

	try {
		return crypto.verify('sha256', data, publicKey, signature);
	} catch {
		try {
			return crypto.verify(null, data, publicKey, signature);
		} catch {
			return false;
		}
	}
}

function integrityCheck(workDir: string, expectedSha?: string, provenanceFile?: string, requireProvenance?: boolean, signatureFile?: string, publicKeyFile?: string, requireSignature?: boolean): IntegrityResult {
	const reasons: string[] = [];
	let tarballPath: string | undefined;
	let tarballSha: string | undefined;
	let provenanceVerified = false;
	let provenanceSignatureVerified = false;

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
		} else if (tarballSha && tarballPath) {
			try {
				const parsed = parseProvenance(provenanceFile);
				const tarName = tarballPath.split(/[/\\]/).pop() ?? '';
				provenanceVerified = verifyProvenance(parsed.json, tarballSha, tarName);
				if (!provenanceVerified) reasons.push('provenance verification failed');

				let signature = parseSignature(signatureFile);
				if (!signature && parsed.envelope?.signatures?.[0]?.sig) {
					signature = Buffer.from(parsed.envelope.signatures[0].sig, 'base64');
				}
				if (!signature && (signatureFile || requireSignature)) reasons.push('provenance signature missing');
				
				if (signature && publicKeyFile) {
					provenanceSignatureVerified = verifySignature(parsed.rawPayload, parsed.payloadType, signature, publicKeyFile);
					if (!provenanceSignatureVerified) reasons.push('provenance signature invalid');
				} else if (signature && !publicKeyFile) {
					reasons.push('provenance public key missing');
				}
			} catch (err: any) {
				reasons.push(`provenance parse failed: ${String(err?.message || err)}`);
			}
		}
	} else if (requireProvenance) {
		reasons.push('provenance required but no file provided');
	}

	if (requireSignature && !signatureFile) {
		reasons.push('provenance signature required but no file provided');
	}

	return {
		passed: reasons.length === 0,
		tarballPath,
		tarballSha256: tarballSha,
		provenanceVerified: provenanceVerified || !requireProvenance,
		provenanceSignatureVerified: provenanceSignatureVerified || !requireSignature,
		reasons
	};
}

function main() {
	const args = process.argv.slice(2);
	const workspaceArgIndex = args.indexOf('--workspace');
	const expectedArgIndex = args.indexOf('--expected-sha');
	const provenanceArgIndex = args.indexOf('--provenance-file');
	const signatureArgIndex = args.indexOf('--provenance-signature');
	const publicKeyArgIndex = args.indexOf('--provenance-public-key');
	const requireProvenance = args.includes('--require-provenance');
	const requireSignature = args.includes('--require-signature');

	const repoRoot = workspaceArgIndex >= 0 ? resolve(args[workspaceArgIndex + 1]) : process.cwd();
	const expectedSha = expectedArgIndex >= 0 ? args[expectedArgIndex + 1] : undefined;
	const provenanceFile = provenanceArgIndex >= 0 ? resolve(args[provenanceArgIndex + 1]) : undefined;
	const signatureFile = signatureArgIndex >= 0 ? resolve(args[signatureArgIndex + 1]) : undefined;
	const publicKeyFile = publicKeyArgIndex >= 0 ? resolve(args[publicKeyArgIndex + 1]) : undefined;

	const result = integrityCheck(repoRoot, expectedSha, provenanceFile, requireProvenance, signatureFile, publicKeyFile, requireSignature);

	console.log(result.passed ? 'Integrity verification passed' : 'Integrity verification failed');
	if (result.tarballSha256) console.log(`Artifact hash: SHA256:${result.tarballSha256}`);
	if (result.tarballPath) console.log(`Tarball: ${result.tarballPath}`);
	console.log(`Provenance: ${result.provenanceVerified ? 'VERIFIED' : 'MISSING'}`);
	if (signatureFile || requireSignature) {
		console.log(`Provenance Signature: ${result.provenanceSignatureVerified ? 'VERIFIED' : 'MISSING'}`);
	}

	if (!result.passed) {
		for (const r of result.reasons) console.error(r);
		process.exit(2);
	}
}

main();
