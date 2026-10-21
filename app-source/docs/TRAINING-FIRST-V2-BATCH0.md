# James Fitness System — Training-first v2.0 / Batch 0 Audit & Batch 1 Baseline

**Date:** 2026-10-21  
**Status:** Batch 0 code review complete; Batch 1 extraction in Draft (CI required; **not a native app or cloud sync release**).  
**Production:** Untouched. No user data read, changed, migrated, or deleted.

## Audited Git basis

| Ref | Observed state / SHA at audit |
| --- | --- |
| `main` | `4667095c4996566492eb5470c902813e9f58fc8a` |
| PR #43 | Draft, unmerged; `1c7d6b9728cd721e906eea349d660786c29cdd83` |
| PR #44 | Draft, unmerged; `fcce5cb22bf40af9784fd9136cb4d5ed299927a8` |
| PR #45 | Draft, unmerged; `6811caf8cc2392b16369b28868630e41b08dcff3` |
| PR #46 | Draft, unmerged; base for this branch, `a7251d16d62edeeceb753861caf71efd4b23ce71` |

PR #46's historical GitHub Actions [run 39552693760](https://github.com/pang0990/james-fitness-system/actions/runs/39552693760) passed **89 unit**, **79 Chromium E2E**, and **18 Linux WebKit E2E** cases, plus typecheck and build. Those are historical results for the parent ref, *not tests of this branch*. Linux WebKit is not iPhone Safari hardware QA.

## Architecture discovered

- Web: `app-source` Next.js 16.4 / React 19 / TypeScript 5.9 / Tailwind 4; static GitHub Pages export + service worker. Existing Today, Nutrition, Training, Progress and settings must be preserved.
- Web data model: `src/lib/domain.ts` includes Training and non-Training types/rules. `src/lib/store.tsx` coordinates account-scoped browser localStorage and revision/conflict checking. Neither a PWA cache nor this localStorage model implements transactional IndexedDB Outbox, cloud history, or multi-device convergence.
- Training: `training-validation.ts` (Zod), `workout-sets.ts` (set operations and correction history), `rest-intervals.ts` (timestamp-based interval mutation), `training-queue.ts` (Cycle completion) and `training-model.ts` (plan/performance computation).
- `training-queue.ts` still directly calls `crypto.randomUUID()` when recording a completed Cycle event and depends on `AppState` / other Web-domain utilities. It is **not yet extracted** and must receive injected platform ID/time dependencies before a fully portable Session completion API is declared ready.
- The Web Supabase client currently configures Google PKCE auth and contains a public publishable key, but Cloud Training tables, secure RPC, RLS and sync are not established by this audit. Do not mistake authentication for data synchronization.
- No Expo / React Native workspace or Supabase database migrations were found in the inspected repository structure. The ability to run iOS/Android simulators, EAS or physical device QA in an actual developer environment is **NOT TESTED**.
- `app-source/AGENTS.md` requires consulting the actual Next 16 installation docs before modifying Next.js platform APIs. This phase does not modify Next.js platform APIs.

## Batch 1: deliberately small shared core extraction (in this Draft)

The unchanged Training data contracts (`Segment`, `SetDraft`, `Session`) move to `src/lib/training-core/types.ts`, and the original `domain.ts` re-exports them for existing Web consumers.

Pure implementations of session/segment validation, Set add/edit/delete/restore/history, and rest interval mutations move into `src/lib/training-core/`. Their original Web import paths remain backwards-compatible re-exports. New `training-core/index.ts` is the cross-platform entry point, with explicit parity and invariant tests.

**This is not yet an independently versioned npm package.** It is the first safe extraction boundary. A later step may publish or link it as a workspace package once Expo Metro, Next transpilation and the repository package manager are inspected. Do not claim Native compatibility until code runs in that runtime.

This extraction intentionally preserves payload fields, old backup shape, public function names, and existing ID/clock behavior. No CUT/GAIN or Nutrition rule is modified.

## Critical unanswered decisions (block future unsafe work)

1. **Server authority**: define who owns the authoritative `active Session` and `Cycle` during concurrent offline device activity; design command-level idempotency and conflict records.
2. **Draft sync**: decide whether `SetDraft` stays device-local initially. Default proposal: local-only until stable server semantics are demonstrated.
3. **Identity**: securely handle native OAuth PKCE redirect, token rotation, device identity, logout, and account-scoped offline cache; never equate same email strings with verified identity linkage.
4. **Storage**: design Web IndexedDB and Expo SQLite *atomic* local business-write + outbox-write; use dedicated adapters, never assume the browser localStorage store meets this.
5. **Migration**: immutable export of legacy JSON, preflight/dry run, stable ID deduplication, user confirmation, transactional import, post-import parity check, reversible fallback. Do not rewrite historical sets or infer stable exercise identity from similar names.
6. **Backend**: isolated Supabase project, migrations, restrictive RLS, grants, server-side validation, multi-user negative tests, paging/cursor rules and failure injection. No production database changes without authorization.
7. **Platform**: verify Expo / React Native / Hermes / Metro compatibility and permission to use native developer credentials before promising Native builds.
8. **Privacy/security**: establish local-at-rest protection / OS credential storage and eviction policy, conflict UI, backup access policy, audit retention, and account-deletion semantics before beta.

## Work sequence after this Draft

1. Prove the extracted shared module passes unit, typecheck, production build, and relevant Playwright regressions. Review both type/runtime dependencies and file diffs.
2. Next small PR: isolate Cycle state transitions and use injected ID/time sources; keep Web behavior unchanged and add concurrent-completion tests.
3. Separate Cloud Foundation Draft: only isolated Supabase development DB with RLS negative/constraint/transaction tests. `main` and production credentials stay untouched.
4. Create minimal Expo iOS/Android test shells and IndexedDB/SQLite adapter tests, then transactional outbox and server sync contract before extensive native screens.
5. Add real native Training UI and Web sync integration in independent, reversible PRs. Test cross-device/offline/concurrent operations.
6. Require iOS/Android real-device, screen reader and keyboard/Safe Area QA before public release.

## Batch 1 acceptance ledger

| Check | State |
| --- | --- |
| PR #43–#46 and `main` read-only baseline | PASS |
| Existing Web import paths preserved by re-exports | IMPLEMENTED — verify via CI |
| Shared `Session`/`Segment`/`SetDraft` contracts | IMPLEMENTED — verify via CI |
| Set, validation, rest logic relocation | IMPLEMENTED — verify via CI |
| Parity/invariant unit tests created | IMPLEMENTED — verify via CI |
| Standalone Expo runtime compatibility | NOT TESTED |
| Supabase DB schema / sync / security | NOT IMPLEMENTED |
| Web IndexedDB / Native SQLite sync | NOT IMPLEMENTED |
| iPhone Safari / VoiceOver / Android real device | NOT TESTED |
| Merge or production deployment | PROHIBITED |

All statuses must be updated from actual CI evidence. Do not claim a native app, full offline-first sync, or release readiness based on this extraction alone.
