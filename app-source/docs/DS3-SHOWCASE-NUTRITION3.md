# Design System 3.0 / Developer UI Showcase / Nutrition 3.0 — batch B

**2026-10-19 · Draft only · not a deployed release.**

## Work delivered

1. Extracted shared light/dark Minimal design tokens to `src/app/tokens-v3.css` instead of keeping those variables inside Today styles. The scope remains Minimal only; Cinematic unchanged.
2. Created a developer review lab at `/ui-showcase/` **inside local Next build only**, with actual live React Surface, Actions, Progress, Empty and Section Heading components, keyboard states and interaction feedback. All data is artificial and no actual accounts are accessed.
3. Excluded the `ui-showcase` static route in `scripts/prepare-pages.mjs` so the HTML is **not copied into the public GitHub Pages published directory**. Since the underlying GitHub repo is public, this is *not* a security boundary and no secret material may go in the lab.
4. Added `NutritionDashboardV3` for **Minimal Nutrition main route only**, using existing `mealTotals`, `visibleMeals`, `resolveDay` and per-day nutrition targets. Compact calorie ring, remaining/over-target, three numeric macro bars, meal count, one primary Add Food action, explicit no-target guidance.
5. Preserved original Cinematic NutritionSummary, existing food picker, Quick Macro log, edit, recipe flows and inline Today Nutrition modal. No food database or fitness calculations changed.
6. Added actual Chromium tests for UI Lab mobile/desktop, Nutrition at 375/390/768/1440, and Quick Macro save + reload (real persistence under test-only isolated identity).

## Review locally

From `app-source` on branch `design/ds3-showcase-nutrition-v3-20261019`:

```sh
npm ci
npm run build
npm run start
```

Open `http://127.0.0.1:3100/ui-showcase/` for developer components, and `/nutrition/` for the functional Nutrition UI (requires safe test sign-in, rather than production user account). Page uses current Minimal light/dark preference.

```sh
npm run typecheck
npm test
npm run test:e2e -- tests/e2e/ds3-showcase-nutrition.spec.ts
```

## Limitations and next phase

- This is **Nutrition dashboard batch 1**, not the final Nutrition / Meals / Recipes redesign. Still needed: chronology-based meal layout, fast search interactions, structured editable recipe quantities, real approved food photographs and illustration process pages.
- No true iOS Safari or Google OAuth validation in current Chromium CI; review those before merging or publishing.
- The historical 10 stale E2E cases in PR #32 have not been silently removed and remain separate work.
- Before release: review GitHub CI screenshots, sign-in, settings, food logging and export/import on real devices; verify that publishing never includes `ui-showcase`. No production database or formula edits permitted in this UI batch.

## Next development order

Nutrition meal list + portion input + duplicate-entry prevention → recipe-detail layout with honest incomplete macros → Training 3.0 active session → Progress data visualization → full design-token refactor without CSS override layers.
