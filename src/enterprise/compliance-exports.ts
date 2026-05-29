import fs from 'fs/promises';

export class ComplianceExports {
  async generateSarif(results: any[], outputPath: string) {
    const sarif = {
      $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
      version: "2.1.0",
      runs: [{
        tool: {
          driver: {
            name: "SlopGuard",
            informationUri: "https://slopguard.dev",
            rules: []
          }
        },
        results: results
      }]
    };
    await fs.writeFile(outputPath, JSON.stringify(sarif, null, 2));
  }

  async generateJsonReport(results: any[], outputPath: string) {
    await fs.writeFile(outputPath, JSON.stringify({ auditChain: results }, null, 2));
  }
  
  exportCiAnnotations(results: any[]) {
    // Output GitHub actions annotations
    results.forEach(result => {
      console.log(`::error file=${result.file},line=1::SlopGuard: ${result.message}`);
    });
  }
}
