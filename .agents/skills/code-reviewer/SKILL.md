---
name: code-reviewer
description: Performs comprehensive and rigorous code reviews on git diffs, specific files, or proposed changes. Analyzes logic correctness, edge cases, security vulnerabilities, performance bottlenecks, regression risks, and architectural integrity.
---

# Code Reviewer Skill

This skill provides an automated, meticulous, and constructive code review workflow for pull requests, working tree diffs, individual files, or proposed architecture changes.

## When to Use This Skill
- The user requests a code review (e.g., "review this code", "review my diff", "code review on storage.ts").
- Before committing or pushing significant modifications to production code.
- Auditing newly written features, bugfixes, or refactored components for hidden edge cases, regressions, or security issues.
- Checking for anti-patterns such as hardcoded entities, hotfix hacks, or leaky abstractions.

---

## Review Methodology

When invoked, the Code Reviewer follows a structured 5-phase analysis:

### Phase 1: Context & Scope Discovery
1. Identify the files and lines under review:
   - For working tree reviews: inspect uncommitted changes (`git diff`, `git status`).
   - For branch reviews: inspect diff against target branch (`git diff main...HEAD`).
   - For specific files: examine full file context, not just isolated lines.
2. Determine the core objective of the changes: what problem does this change solve, and what invariants must be maintained?

### Phase 2: Correctness & Logic Verification
- **Control Flow & State**: Trace all branching logic (`if`, `switch`, loops, ternary operators). Are all paths reachable and terminated properly?
- **Data Integrity & Calculations**: Verify mathematical calculations, rounding, currency formatting, and state updates (especially in billing, analytics, and accounting).
- **Idempotency & Race Conditions**: Ensure asynchronous operations handle out-of-order execution, cancellation, and repeated calls safely.
- **Null / Undefined Safety**: Verify that optional chaining, nullish coalescing, and boundary checks prevent runtime crashes (`TypeError: Cannot read property of undefined`).

### Phase 3: Architectural Integrity & Code Hygiene
- **No Hardcoded Hotfixes**: Ensure logic is generic and reusable across all records, entities, and tenants. Flag any hardcoded IDs, names, or branch-specific hacks.
- **Single Source of Truth**: Ensure state is not duplicated unsynchronized across multiple stores, caches, or components.
- **TypeScript & Type Safety**:
  - Eliminate improper type assertions (`as unknown as X`, `any`).
  - Verify that interfaces and types accurately model real payloads and API contracts.
- **Separation of Concerns**: UI components should not contain heavy business calculations; data layer should not know about DOM or presentation state.

### Phase 4: Performance, Security & Resilience
- **Performance**:
  - Check for unnecessary re-renders, recalculations in render loops, and missing memoization (`useMemo`, `useCallback`) where computationally expensive.
  - Watch for $O(N^2)$ iterations or nested lookups over datasets where maps/dictionaries should be used.
- **Security**:
  - Inspect for injection vectors (SQL, XSS, unescaped HTML).
  - Verify that client-side storage (e.g., `localStorage`) does not leak sensitive credentials or tokens.
  - Ensure input validation and sanitization are enforced before persisting data.
- **Error Handling & Failure Modes**:
  - Check graceful degradation when storage is full, network is offline, or JSON parsing fails.
  - Ensure meaningful error messages and logger boundaries exist.

### Phase 5: Structured Review Report Output

Present findings in a clear, actionable format with standardized severity ratings:

```markdown
# 🔍 Code Review: [Target / Component Name]

## 📋 Executive Summary
[High-level summary of the reviewed changes, overall assessment, and readiness: Ready / Needs Work / Blocked]

---

## 🚨 Critical / Blocker Issues (Must Fix Before Merge)
Issues that cause crashes, data corruption, security flaws, or breaking regressions.
- **[File & Line]**: Issue description.
  - **Impact**: Why this breaks in production.
  - **Fix**: Suggested fix with code snippet.

---

## ⚠️ Major Issues (High Priority)
Logic bugs, performance bottlenecks, unhandled edge cases, or violation of architectural standards.
- **[File & Line]**: Issue description and suggested resolution.

---

## 💡 Minor Improvements & Code Health
Maintainability, typing improvements, dead code cleanup, or readability enhancements.
- **[File & Line]**: Suggestion.

---

## 🎨 Nits & Style Notes (Optional)
Non-blocking suggestions regarding naming, comments, formatting, or idiomatic patterns.

---

## 🛠️ Recommended Actions
1. [Action item 1]
2. [Action item 2]
```

---

## Review Best Practices for the Agent
1. **Be constructive and precise**: Always specify line numbers and provide concrete before/after code snippets for recommendations.
2. **Prioritize high-impact issues**: Focus heavily on logic bugs, data loss risks, and maintainability before nitpicking style.
3. **Verify tests and builds**: Run existing test suites (`npm test` / `vitest run`) and type checks (`npm run build` or `npx tsc --noEmit`) to confirm no regressions are introduced.
