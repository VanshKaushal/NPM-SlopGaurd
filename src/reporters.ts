import { validatePackage } from './core/validator.js'
import { validateDependencyGraph } from './core/graph.js'

export function reportJson(result: any) {
  console.log(JSON.stringify(result, null, 2))
}

export function reportSarif(result: Awaited<ReturnType<typeof validateDependencyGraph>> | Awaited<ReturnType<typeof validatePackage>>) {
  const sarif: any = {
    version: "2.1.0",
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    runs: [{
      tool: {
        driver: {
          name: "SlopGuard",
          informationUri: "https://github.com/slopguard",
          version: "1.0.0"
        }
      },
      results: []
    }]
  }

  // Handle single package validation result
  if ('score' in result) {
    if (result.hardBlocked || result.score < 75) {
      sarif.runs[0].results.push({
        ruleId: "SG-001",
        level: result.hardBlocked ? "error" : "warning",
        message: { text: `Package ${result.pkg}@${result.version} has risk score ${100 - result.score}` },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: "package.json" }
          }
        }]
      })
    }
  } else {
    // Handle graph validation result
    for (const res of result.results) {
      if (res.hardBlocked || res.score < 75) {
        sarif.runs[0].results.push({
          ruleId: "SG-001",
          level: res.hardBlocked ? "error" : "warning",
          message: { text: `Package ${res.pkg}@${res.version} has risk score ${100 - res.score}` },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: "package-lock.json" }
            }
          }]
        })
      }
    }
  }

  console.log(JSON.stringify(sarif, null, 2))
}
