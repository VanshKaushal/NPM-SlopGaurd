#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import crypto from 'node:crypto'
import { detectLockfile, parseLockfile } from '../src/core/lockfiles.js'
import { discoverWorkspaces } from '../src/core/workspaces.js'
import { validateDependencyGraph } from '../src/core/graph.js'
import { DependencyGraph } from '../src/types.js'

type Scenario = {
	name: string
	rootDir: string
	expectCycle?: boolean
	expectMalformedLockfile?: boolean
	expectDuplicateNames?: boolean
}

type ScenarioResult = {
	name: string
	durationMs: number
	nodeCount: number
	edgeCount: number
	maxDepth: number
	memoryRssMb: number
	cycle?: string[]
	malformedLockfile: boolean
	duplicateNames: string[]
	traversalStable: boolean
}

function log(...args: any[]) {
	console.log('[monorepo]', ...args)
}

function writeJson(filePath: string, data: unknown) {
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

function makeTempDir(prefix: string) {
	return fs.mkdtempSync(path.join(tmpdir(), prefix))
}

function hashString(value: string) {
	return crypto.createHash('sha256').update(value).digest('hex')
}

function detectDuplicateNames(pkgFiles: string[]) {
	const seen = new Map<string, string>()
	const duplicates: string[] = []
	for (const file of pkgFiles) {
		try {
			const raw = fs.readFileSync(file, 'utf8')
			const json = JSON.parse(raw) as { name?: string }
			if (!json.name) continue
			if (seen.has(json.name)) duplicates.push(json.name)
			else seen.set(json.name, file)
		} catch {
			continue
		}
	}
	return Array.from(new Set(duplicates))
}

function analyzeGraph(graph: DependencyGraph | null) {
	if (!graph) return { nodeCount: 0, edgeCount: 0, maxDepth: 0, cycle: undefined as string[] | undefined }

	const nodes = graph.nodes
	let edgeCount = 0
	for (const node of nodes.values()) edgeCount += node.dependencies.size

	const visited = new Set<string>()
	const stack = new Set<string>()
	let cycle: string[] | undefined
	let maxDepth = 0

	const visit = (id: string, depth: number, pathStack: string[]) => {
		if (cycle) return
		maxDepth = Math.max(maxDepth, depth)
		if (stack.has(id)) {
			const idx = pathStack.indexOf(id)
			cycle = idx >= 0 ? pathStack.slice(idx).concat(id) : [id, id]
			return
		}
		if (visited.has(id)) return
		visited.add(id)
		stack.add(id)
		pathStack.push(id)
		const node = nodes.get(id)
		if (node) {
			for (const [dep, range] of node.dependencies.entries()) {
				const depId = `${dep}@${range}`
				visit(depId, depth + 1, pathStack)
				if (cycle) break
			}
		}
		pathStack.pop()
		stack.delete(id)
	}

	for (const id of nodes.keys()) {
		if (cycle) break
		visit(id, 0, [])
	}

	return { nodeCount: nodes.size, edgeCount, maxDepth, cycle }
}

function snapshotGraph(graph: DependencyGraph | null) {
	if (!graph) return 'null'
	const entries: string[] = []
	const ids = Array.from(graph.nodes.keys()).sort()
	for (const id of ids) {
		const node = graph.nodes.get(id)
		const deps = node ? Array.from(node.dependencies.entries()).sort() : []
		const depString = deps.map(([name, range]) => `${name}:${range}`).join(',')
		entries.push(`${id}|${depString}`)
	}
	return hashString(entries.join('\n'))
}

function createScenarioCycle(rootDir: string) {
	fs.mkdirSync(path.join(rootDir, 'packages', 'a'), { recursive: true })
	fs.mkdirSync(path.join(rootDir, 'packages', 'b'), { recursive: true })
	writeJson(path.join(rootDir, 'package.json'), {
		name: 'cycle-root',
		version: '1.0.0',
		workspaces: ['packages/*'],
		dependencies: { a: '1.0.0' }
	})
	writeJson(path.join(rootDir, 'packages', 'a', 'package.json'), {
		name: 'a',
		version: '1.0.0',
		dependencies: { b: '1.0.0' }
	})
	writeJson(path.join(rootDir, 'packages', 'b', 'package.json'), {
		name: 'b',
		version: '1.0.0',
		dependencies: { a: '1.0.0' }
	})
	writeJson(path.join(rootDir, 'package-lock.json'), {
		name: 'cycle-root',
		lockfileVersion: 3,
		packages: {
			'': { name: 'cycle-root', version: '1.0.0', dependencies: { a: '1.0.0' } },
			'node_modules/a': { name: 'a', version: '1.0.0', dependencies: { b: '1.0.0' } },
			'node_modules/b': { name: 'b', version: '1.0.0', dependencies: { a: '1.0.0' } }
		}
	})
}

function createScenarioDuplicate(rootDir: string) {
	fs.mkdirSync(path.join(rootDir, 'packages', 'x'), { recursive: true })
	fs.mkdirSync(path.join(rootDir, 'packages', 'y'), { recursive: true })
	writeJson(path.join(rootDir, 'package.json'), {
		name: 'dup-root',
		version: '1.0.0',
		workspaces: ['packages/*']
	})
	writeJson(path.join(rootDir, 'packages', 'x', 'package.json'), {
		name: 'dup',
		version: '1.0.0'
	})
	writeJson(path.join(rootDir, 'packages', 'y', 'package.json'), {
		name: 'dup',
		version: '1.0.1'
	})
}

function createScenarioMalformedLockfile(rootDir: string) {
	writeJson(path.join(rootDir, 'package.json'), {
		name: 'malformed-root',
		version: '1.0.0'
	})
	fs.writeFileSync(path.join(rootDir, 'package-lock.json'), '{ "name": "bad", ') // invalid JSON
}

function createScenarioDeepNesting(rootDir: string) {
	writeJson(path.join(rootDir, 'package.json'), {
		name: 'deep-root',
		version: '1.0.0',
		workspaces: ['packages/**']
	})
	let current = path.join(rootDir, 'packages')
	fs.mkdirSync(current, { recursive: true })
	for (let i = 0; i < 20; i += 1) {
		current = path.join(current, `level-${i}`)
		fs.mkdirSync(current, { recursive: true })
		writeJson(path.join(current, 'package.json'), {
			name: `deep-${i}`,
			version: '1.0.0'
		})
	}
}

async function runScenario(scenario: Scenario): Promise<ScenarioResult> {
	const start = Date.now()
	const workspace = discoverWorkspaces(scenario.rootDir)
	const duplicateNames = detectDuplicateNames(workspace.packageJsonFiles)

	const detected = detectLockfile(scenario.rootDir)
	const graph = detected ? parseLockfile(detected) : null
	const malformedLockfile = Boolean(detected && !graph)

	const graphSummary = analyzeGraph(graph)

	const runA = await validateDependencyGraph({
		cwd: scenario.rootDir,
		recursive: true,
		offline: true,
		depthLimit: 200,
		concurrency: 8
	})
	const runB = await validateDependencyGraph({
		cwd: scenario.rootDir,
		recursive: true,
		offline: true,
		depthLimit: 200,
		concurrency: 8
	})

	const stable = JSON.stringify({
		total: runA.totalPackages,
		scanned: runA.scannedPackages,
		depth: runA.dependencyDepth,
		warnings: runA.warnings,
		blocked: runA.blocked,
		skipped: runA.skipped,
		scriptWarnings: runA.scriptWarnings?.length ?? 0,
		graphHash: snapshotGraph(graph)
	}) === JSON.stringify({
		total: runB.totalPackages,
		scanned: runB.scannedPackages,
		depth: runB.dependencyDepth,
		warnings: runB.warnings,
		blocked: runB.blocked,
		skipped: runB.skipped,
		scriptWarnings: runB.scriptWarnings?.length ?? 0,
		graphHash: snapshotGraph(graph)
	})

	const durationMs = Date.now() - start
	const memoryRssMb = Math.round(process.memoryUsage().rss / 1024 / 1024)

	return {
		name: scenario.name,
		durationMs,
		nodeCount: graphSummary.nodeCount,
		edgeCount: graphSummary.edgeCount,
		maxDepth: graphSummary.maxDepth,
		memoryRssMb,
		cycle: graphSummary.cycle,
		malformedLockfile,
		duplicateNames,
		traversalStable: stable
	}
}

async function main() {
	const scenarios: Scenario[] = []

	const cycleRoot = makeTempDir('slopguard-cycle-')
	createScenarioCycle(cycleRoot)
	scenarios.push({ name: 'cycle-lockfile', rootDir: cycleRoot, expectCycle: true })

	const dupRoot = makeTempDir('slopguard-dup-')
	createScenarioDuplicate(dupRoot)
	scenarios.push({ name: 'duplicate-names', rootDir: dupRoot, expectDuplicateNames: true })

	const malformedRoot = makeTempDir('slopguard-badlock-')
	createScenarioMalformedLockfile(malformedRoot)
	scenarios.push({ name: 'malformed-lockfile', rootDir: malformedRoot, expectMalformedLockfile: true })

	const deepRoot = makeTempDir('slopguard-deep-')
	createScenarioDeepNesting(deepRoot)
	scenarios.push({ name: 'deep-nesting', rootDir: deepRoot })

	const results: ScenarioResult[] = []
	const failures: string[] = []

	for (const scenario of scenarios) {
		log(`Running ${scenario.name}`)
		const result = await runScenario(scenario)
		results.push(result)

		if (scenario.expectCycle && !result.cycle) {
			failures.push(`${scenario.name}: expected cycle not detected`)
		}
		if (!scenario.expectCycle && result.cycle) {
			failures.push(`${scenario.name}: unexpected cycle detected`)
		}
		if (scenario.expectMalformedLockfile && !result.malformedLockfile) {
			failures.push(`${scenario.name}: expected malformed lockfile not detected`)
		}
		if (!scenario.expectMalformedLockfile && result.malformedLockfile) {
			failures.push(`${scenario.name}: unexpected malformed lockfile detected`)
		}
		if (scenario.expectDuplicateNames && result.duplicateNames.length === 0) {
			failures.push(`${scenario.name}: expected duplicate names not detected`)
		}
		if (!scenario.expectDuplicateNames && result.duplicateNames.length > 0) {
			failures.push(`${scenario.name}: unexpected duplicate names detected`)
		}
		if (!result.traversalStable) {
			failures.push(`${scenario.name}: traversal instability detected`)
		}
	}

	for (const r of results) {
		log(`${r.name}: duration=${r.durationMs}ms nodes=${r.nodeCount} edges=${r.edgeCount} depth=${r.maxDepth} memory=${r.memoryRssMb}MB stable=${r.traversalStable}`)
	}

	if (failures.length > 0) {
		console.error('MONOREPO FAILURE DETECTED')
		for (const f of failures) console.error(f)
		const firstCycle = results.find(r => r.cycle)
		if (firstCycle?.cycle) {
			console.error('Workspace Cycle:')
			console.error(firstCycle.cycle.join(' -> '))
		}
		const peakMem = Math.max(...results.map(r => r.memoryRssMb))
		console.error(`Memory Spike: ${peakMem}MB peak usage`)
		if (results.some(r => !r.traversalStable)) {
			console.error('Traversal Instability: graph.ts traversal inconsistent')
		}
		process.exit(2)
	}

	console.log('MONOREPO VALIDATION PASSED')
	process.exit(0)
}

main().catch((err) => {
	console.error(err)
	process.exit(3)
})
