export interface Policy {
  name: string;
  strictness: 'lenient' | 'strict' | 'paranoid';
  requireProvenance: boolean;
  allowPreReleases: boolean;
  allowUnsigned: boolean;
  allowedRegistries: string[];
  bannedLicenses: string[];
  maxGraphSize: number;
  frozenLockfileOnly?: boolean;
  auditRequirements: Record<string, 'warn' | 'fail'>;
}

export class OrgGovernance {
  private activePolicies: Map<string, Policy> = new Map();

  loadPolicy(id: string, policy: Policy) {
    this.activePolicies.set(id, policy);
  }

  mergePolicies(basePolicy: Policy, overridePolicy: Policy): Policy {
    // Deterministic policy merging
    return {
      name: `${basePolicy.name}-merged`,
      strictness: overridePolicy.strictness || basePolicy.strictness,
      requireProvenance: overridePolicy.requireProvenance ?? basePolicy.requireProvenance,
      allowPreReleases: overridePolicy.allowPreReleases ?? basePolicy.allowPreReleases,
      allowUnsigned: overridePolicy.allowUnsigned ?? basePolicy.allowUnsigned,
      allowedRegistries: Array.from(new Set([...basePolicy.allowedRegistries, ...(overridePolicy.allowedRegistries || [])])),
      bannedLicenses: Array.from(new Set([...basePolicy.bannedLicenses, ...(overridePolicy.bannedLicenses || [])])),
      maxGraphSize: Math.min(basePolicy.maxGraphSize, overridePolicy.maxGraphSize),
      frozenLockfileOnly: overridePolicy.frozenLockfileOnly ?? basePolicy.frozenLockfileOnly,
      auditRequirements: { ...basePolicy.auditRequirements, ...overridePolicy.auditRequirements }
    };
  }

  enforce(policy: Policy, context: any): boolean {
    // Placeholder for actual enforcement logic
    console.log(`Enforcing policy: ${policy.name}`);
    return true;
  }
}
