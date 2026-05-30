# SECURITY RESPONSE RFC

## 1. Disclosure Workflow
Vulnerabilities should be reported via GitHub Security Advisories. We guarantee a 48-hour initial response time for all submitted issues.

## 2. Triage & Patches
1. **Validation**: The core team validates the deterministic exploitability of the issue.
2. **Patching**: A fix is developed in a private branch.
3. **Release**: An out-of-band security patch is published using the deterministic release pipeline.
4. **Disclosure**: A CVE is issued, and a detailed post-mortem is published.

## 3. Security Scope
Only vulnerabilities affecting the deterministic resolution, policy enforcement, or execution boundaries of SlopGuard are considered high-severity. Cosmetic issues in CLI output are out of scope for immediate security response.
