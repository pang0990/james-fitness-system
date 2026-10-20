# James Fitness System — Screen Redesign / Design System 3.0

**Status:** active design & engineering plan, first foundation PR; 2026-10-19.
**Style:** Apple-inspired, black/white/grey, fine real-world material depth, restrained interaction. Do NOT introduce gold, armored characters or synthetic metrics into Minimal.
**Tech:** Existing Next 16 / React 19 / GitHub Pages static app. Real data flows, CUT/GAIN rules, and local per-user records stay unchanged.
**Decision:** Implement **App Shell + shared components first**, then redesign one workflow at a time, with mobile and desktop QA before release.

## Shared App Shell — all four main tabs

| Width | Navigation | Main content | Spacing |
| --- | --- | --- | --- |
| 375–767 | Floating four-tab bottom dock, touch area ≥44px; top 64px header | One column | 18px sides / 12–20px gaps; generous dock-safe padding |
| 768–1023 | Bottom dock until navigation side rail is fit-tested | One column or balanced 2-up | 24px sides |
| ≥1024 | Fixed 206px sidebar with labels; hide bottom dock | 1040–1120px centered workspace | 28–34px sides, 16–24px gaps |

Current header and account controls remain, but their proportions, alignment and language should be consistent. Full-screen workout session remains intentionally free of sidebar/dock. Always test 375, 390, 430, 768, 1024 and 1440; Safari's own browser chrome is not counted as web UI.

### Shared foundation tokens

Colors: canvas #F5F5F7, surface white, ink #1D1D1F, secondary ink #6E6E73; dark equivalent from the Today 3.0 tokens. Different data values use grey shades rather than arbitrary brand colors. Preserve accessible error/warning status.
Type: system-first fonts suitable for Taiwanese Traditional Chinese, 28/32 heading, 18–20 section, 15–17 card title, 13–15 body, 12 supporting; tabular numerals for targets, weights, macros and clocks.
Spacing: 4px base; typically 8/12/16/20/24/32. Radius: 12 controls, 20 cards, 24 overlays. Elevation E0 canvas, E1 card (subtle), E2 pressable, E3 floating dock, E4 modal/sheet.
Motion: press 120–180ms, tab 180–240, panel 240–320, progress 350–550; honor OS **and** in-app reduced-motion, no looping decoration, no reflow-heavy animations.
Components created first: `AppSidebar`, `AppBottomNavigation`, `UiSurface`, `UiButton`, `UiActionLink`, `UiSectionHeading`, `UiProgressTrack`, `UiEmptyState`. Preserve existing class names for old routes where necessary until replaced.

## Page 1 — Today 3.0 (initial prototype already exists)

**Mobile:** date & cycle → *one* current-action card → compact calorie/P/C/F → training context → water/recovery → quick logs → Activity. If there is an active workout, the CTA must resume; if completed, show completion; without a plan, guide setup. No repeated CTA.
**Desktop:** same content in a responsive two-column grid, not giant phone cards. Sidebar replaces bottom dock. Distinct fitness-equipment illustration is decorative and performant, never required to communicate data.
**States:** incomplete onboarding, no calorie target, no food log, resting/training day, in-progress/completed workout, empty recovery, partial/full activity, pending recommendation, safety warning, storage failure. Safety notices outrank encouragement.
**Current work:** PR #37, includes functional prototype and synthetic-account Playwright verification. Upcoming polish: align card hierarchy to actual screenshots, test Dynamic Type and real Safari.

## Page 2 — Nutrition / Calories, Meals, Recipes

**Mobile Calories:** date & day type controls → compact one-line energy/remaining summary + 88–112px calorie ring → three labeled P/C/F horizontal tracks with numerical goals → pinned “加入飲食” action → meal list. Avoid 4 giant ring cards and losing meal entries below the fold.
**Desktop Calories:** 2-column summary + meal history, persistent meal-add affordance; no redundant giant margin.
**Meals:** readable chronological rows with calories/macros; tap for details, edit/undo if existing behavior supports it; never invent nutritional data. No target: `—` and setup CTA. Display over-target numerically instead of clamping the value to 100%.
**Recipes:** editorial real-food photo, textual ingredients with precise portions, recipe details and 4 simple step illustrations when approved assets exist; do not fake food photography. When macros are incomplete, show that explicitly and prevent unsupported logging. A portion multiplier must either also scale ingredient quantities or clearly warn it does not.
**Existing modules:** `daily.tsx`, `recipes.tsx`, `meal-settings.tsx`, `fitness-app.tsx`.
**Acceptance:** add/edit food, meal totals, macro target states, date changes, ingredient portion UX, modal scroll, no lost records; maintain formula rules.

## Page 3 — Training / Plan, Active Session, History

**Plan:** current cycle + target volume at top, clear single “開始／繼續訓練” button, compact numbered exercises (not tall illustration cards), secondary access to calendar/history/templates via disclosure.
**Active session:** highest-priority readable controls: exercise name → set sequence → weight/reps/RIR → complete set → rest timer. Avoid any expensive page transition or accidental tab switch while lifting. Warm-up/working/drop/rest-pause state distinct in text and icons, not color alone.
**History:** dated sessions with actionable summary, progress and detail. No fake e1RM changes when information is insufficient.
**Mobile:** thumb-friendly sticky rest/complete controls with safe-area clearance. **Desktop:** stable 2-column detail; never show a redundant phone dock during active session.
**Existing modules:** `training-flow.tsx`, `training-plan.tsx`, `training-planning.tsx`, `detail-pages.tsx`, `training-review.tsx`.
**Acceptance:** templates unchanged, set save/undo, resuming an unfinished workout, cycle advancement, timer lifecycle, mobile keyboard avoiding CTA, pain-warning precedence.

## Page 4 — Progress / Overview, Body, Strength

**Overview:** period selection → true trends → brief evidence description → body records/photos → key statistics. Use understated monochrome chart axes, guide labels and tabular numerals. Do not reserve a giant graph-shaped blank box for missing data.
**Body:** metric entry, existing measurements, weight trend and genuine progress photographs only. Photos follow user consent and clear on-device persistence limitations.
**Strength:** actual logged exercise sets and performance; distinct “insufficient evidence” state until enough sessions. No made-up improvement claim.
**Desktop:** balanced chart + concise KPI column; **Mobile:** full-width accessible charts, never rely on color alone.
**Existing modules:** `progress-direction.tsx`, `trends.tsx`, `weekly-checkin.tsx`, `activity-trend.tsx`.
**Acceptance:** 7D/30D/90D/1Y date filters, empty vs insufficient vs available trend, series labels, readable tooltips/keyboard fallback and real-value verification.

## Other critical screens

| Screen / flow | Required redesign | Safety/preservation |
| --- | --- | --- |
| Login/Google callback | One clear action, sign-in in-progress/error/retry states, honest local-data disclosure | OAuth PKCE unchanged; no credentials in UI cache |
| Onboarding / Profile | Step progress, compact labeled fields, goal choices and eligibility warnings | Existing health gates and formulas unchanged; never silently recalculate saved targets |
| Settings/Appearance | Group by Account, Data, Appearance, Fitness; standardized rows and toggles | Old records remain, ability to export/delete preserved |
| Backup/Restore | Confirmation and preview before import; explicit success/validation/conflict feedback | Must reject invalid backup without overwriting |
| Modal/Bottom Sheet | Focus trap, Escape, sticky action, scroll/body lock, safe-area, loading/errors | Unsaved edits must not disappear without notice |
| Content/Knowledge | Editorial reading typography, evidence badge hierarchy and adequate footnotes | Do not fabricate science or references |
| Recipes detail | Independent cookbook-style recipe view | Need real approved photography before photo layout is considered complete |
| Notifications/Toast | Single priority notice row, non-intrusive confirmation | Safety information cannot get hidden by rotation/animation |

## Implementation batches & acceptance gates

- **DS3-A / now:** Shell and design primitives in feature branch; no new source of health numbers. Page-by-page spec established. CI typecheck/unit/build and mobile+desktop Playwright snapshots.
- **DS3-B:** Today consolidate onto shared primitives; finish real-device + state snapshots; do not merge until 375/390/430/768/1024/1440 pass.
- **DS3-C:** Nutrition list/dashboard/recipes (separately reviewed); real record creation and backups smoke.
- **DS3-D:** Training active-session first then plan/history; ensure timers/input hold on low-end phones.
- **DS3-E:** Progress charts and empty state; contrast/keyboard/VoiceOver audit.
- **DS3-F:** Onboarding, Settings, Auth and Modal consistency; cross-device safe-area and accessibility.
- **Release gate:** All P0 security/health-policy exceptions resolved separately; verify Google sign-in with safe account, backup/restore, non-destructive migration, Safari, current CI. Explicit release approval before merging any draft.

**No part of this design document is a claim that every screen is already implemented.**
