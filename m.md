You are fixing exactly 2 failing tests in SlopGuard. 
Build is clean (0 errors). 24/26 tests pass. Fix only these 2.
Do not touch any passing tests. Do not change business logic.

════════════════════════════════════════
FAILURE 1 — chaos-monorepo.test.js
════════════════════════════════════════

ERROR:
  AssertionError: assert.ok(/CHAOS MONOREPO VALIDATION/.test(output))
  actual: false (string 'CHAOS MONOREPO VALIDATION' not found in output)

FILE: tests/chaos-monorepo.test.ts (line 17)

STEP 1 — Open tests/chaos-monorepo.test.ts and show me:
  - How output is captured (what command is spawned)
  - What the test expects to find in output
  - What the actual output contains (add a console.log(output) 
    temporarily to see what IS being printed)

STEP 2 — Open the script/module that chaos-monorepo.test.ts invokes.
  Find where "CHAOS MONOREPO VALIDATION" is supposed to be printed.
  Check if it is:
    (a) Inside an if-block that is not being reached
    (b) Printed to stderr instead of stdout (test may only capture stdout)
    (c) The string was renamed/removed during the recent refactor
    (d) The script exits before reaching the print statement

STEP 3 — Apply the minimal fix:

  CASE A (if-block not reached):
    Trace why the condition fails. Fix the condition or the 
    test fixture that feeds it. Do not remove the assertion.

  CASE B (stderr vs stdout):
    In the test, change the spawn options to capture both:
      const result = spawnSync(cmd, args, { 
        encoding: 'utf8',
        stdio: 'pipe'  
      })
      const output = (result.stdout || '') + (result.stderr || '')
    This is a 2-line fix in the test file only.

  CASE C (string renamed):
    Find the current string being printed by the chaos script.
    Update the regex in the test to match the actual current string.
    Example: /CHAOS MONOREPO VALIDATION/.test(output)
    becomes: /chaos monorepo/i.test(output)  ← adjust to actual

  CASE D (early exit):
    Find the exit point. Fix the script to reach the print statement
    OR fix the test to assert on what the script actually outputs.

════════════════════════════════════════
FAILURE 2 — smoke-test.test.js  
════════════════════════════════════════

ERROR:
  Error: spawnSync cmd.exe ENOBUFS
  cause: 'npm pack --json' output exceeds 1MB spawnSync buffer limit
  result: exit code 1 → test asserts exit code 0 → FAIL

FILE: src/scripts/smoke-test.ts (line ~70, function buildAndPack)
FILE: tests/smoke-test.test.ts (line 22)

ROOT CAUSE:
  execSync('npm pack --json') uses default maxBuffer of 1MB.
  SlopGuard's packed tarball metadata exceeds 1MB.
  spawnSync kills the process with SIGTERM → ENOBUFS.

FIX — Open src/scripts/smoke-test.ts, find the buildAndPack function.
Locate this line (approximately line 70):
  execSync('npm pack --json', ...)
  OR
  spawnSync(..., ['pack', '--json'], ...)

Apply ONE of these fixes (choose the simplest that applies):

  FIX OPTION A — Increase maxBuffer (simplest fix):
    execSync('npm pack --json', { 
      maxBuffer: 1024 * 1024 * 64,  // 64MB — well above any real pack output
      encoding: 'utf8'
    })

  FIX OPTION B — If using spawnSync directly:
    spawnSync('npm', ['pack', '--json'], {
      maxBuffer: 1024 * 1024 * 64,
      encoding: 'utf8',
      shell: true
    })

  FIX OPTION C — If you don't actually need the JSON output:
    Replace 'npm pack --json' with 'npm pack'
    This produces human-readable output that is much smaller.
    Update any downstream parsing of the JSON output accordingly.

  FIX OPTION D — If the pack output is legitimately huge 
  (many files being packed accidentally):
    Run 'npm pack --dry-run' locally and check what files are included.
    If node_modules, dist/tests, or fixture files are being packed,
    add them to .npmignore:

      dist/tests/
      tests/
      scripts/
      .github/
      node_modules/

    Then re-run — the output will shrink dramatically.
    This is the CORRECT fix if the pack is bloated.
    Combine with FIX OPTION A as a safety net.

RECOMMENDED: Apply OPTION D first (check .npmignore), then OPTION A 
as a safety net. Both together = permanently solved.

════════════════════════════════════════
VERIFICATION
════════════════════════════════════════

After both fixes:

1. npm run build     → must be 0 errors
2. npm test          → must show:
     ℹ pass 26
     ℹ fail 0

If chaos-monorepo still fails after your fix, paste the 
actual output content (from the console.log you added in STEP 1).
That string is the ground truth — the test must match it.

If smoke-test still fails after maxBuffer increase, run:
  npm pack --dry-run 2>&1 | head -50
and paste the output. We need to see what is being packed.

════════════════════════════════════════
CONSTRAINTS
════════════════════════════════════════

DO NOT:
  - Delete either failing test
  - Change the assertion to always pass
  - Skip the test with .skip()
  - Touch any of the 24 passing tests
  - Change any validation or scoring logic