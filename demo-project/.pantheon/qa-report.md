# QA Report: hello-world CLI

**Verdict:** ✅ **PASS** — 0 defects

## Acceptance Criteria

| # | Criterion | Status |
|---|---|---|
| 1 | CLI accepts a name argument | ✅ |
| 2 | Outputs "Hello, \<name\>!" | ✅ |
| 3 | Falls back to "Hello, World!" when no name | ✅ |
| 4 | Runs with a single command | ✅ `node hello.js` |
| 5 | Tests pass | ✅ 7/7 |

## Attack Surface

| Vector | Finding |
|---|---|
| No-arg call | ✅ Falls back to "World" |
| null/undefined | ✅ Falls back to "World" |
| Empty string | ✅ Returns "Hello, !" |
| Special characters | ✅ Passes through correctly |
| Numeric input | ✅ Coerced to string |
| Too many args | ✅ First arg used, rest ignored |

## Defects: 0

No issues found.

## Regression Tests Added

- `hello(null)` → "Hello, World!"
- `hello(undefined)` → "Hello, World!"
- `hello(42)` → "Hello, 42!"
- `hello("Bob & Alice")` → "Hello, Bob & Alice!"

## Test Summary

```
✓ hello.test.js (7 tests)
─────────────────────
7 passed | 0 failed
```
