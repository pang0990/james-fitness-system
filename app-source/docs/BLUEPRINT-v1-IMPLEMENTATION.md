# JFS Product Architecture Blueprint v1.0 — implementation ledger
2026-10-13 · Supersedes stale assumptions in older UI-only roadmaps.

This ledger tracks actual behavior of the GitHub Pages deployment, **not simply planned routes**. The user's comprehensive Blueprint (Sitemap, User Flow, Settings) remains the product target. Do not treat a static route's presence as functional readiness.

## Existing and implemented in this release
- Navigation: four tabs Today / Nutrition / Training / Progress and four non-duplicate personal menu destinations.
- Five onboarding steps, mobile first: Basic, CUT/GAIN, Activity, Safety, Result; draft stored locally on this device. All five fixed static routes exist; Profile remains editable separately.
- CUT start: existing Numbers 3.0 P/C/F coefficients and C multipliers 1.0 / .7 / .5; conservative age, safety, calorie-floor gate. Unknown activity category is Tracking Only, not silently Level 1.
- GAIN provisional start: 42 kcal/kg; P1.8g/kg; F1.0g/kg; C fills the remainder; same across three day types. Minimum age18, resistance days >=3, male BF<25% female BF<35% or no bodyfat BMI<30, safety exclusion. This is *not* a universal validated hypertrophy formula.
- Provisional-to-personal GAIN baseline: evaluate only after >=14 days, two weeks with >=5 weight entries each, >=10 complete nutrition days, >=4 completed resistance sessions, scheduled training completion >=75%, and no recent pain Safety Hold. Provide Accept/Keep. Accept creates next-day GAIN version using historical average recorded P/C/F/kcal; Keep retains current. No automatic overwrite.
- Nutrition: each enabled meal slot counts as logged, explicitly skipped (not eaten) or missing; remove manual daily 'complete' toggle. New dates save meal-template snapshot so later changes do not rewrite older names. Auto update day completion when logging a meal/recipe.
- Training Calendar single-day train/rest changes **ask** whether to adjust Nutrition Day Type; cancel only affects Calendar. Past day nutrition snapshots are never automatically changed.
- Progress Quick Health Log and real 7-day This Week stats; separate Logging Completion from Nutrition Adherence; no fabricated chart statistics. Detailed legacy analytics and weekly Check-in remain available.
- Knowledge corpus: six articles including five uploaded evidence sources. Recipes: 129 titles; 119 have source ingredients/method; 10 title-only, with 9 of the 119 also lacking some required macros. Do not invent values.
- Existing workouts, plans, food database, backups and settings are retained.

## Existing URLs
- /today /nutrition /training /progress
- /onboarding and /onboarding/basic /goal /activity /safety /result
- /nutrition/foods /nutrition/recipes /nutrition/recipes/detail?recipe=...
- /training/plan /training/plan/new /training/calendar /training/session
- /training/history/session?id=... /training/exercises/detail?id=...
- /progress/{body,nutrition,training,recovery,check-in}
- /progress/training/exercises?name=...
- /profile /knowledge /data /settings and Settings subroutes.

GitHub Pages uses a Next.js static build. Server-dynamic `/path/:id` segments are not available in this deployment; fixed detail paths with query identifiers are the working, reviewable equivalent.

## Not yet live — do NOT call complete
- **Google OAuth login** required for final first release, per user decision A. Live GitHub Pages currently remains a local-data transition version; /login and /auth/* only show truthful not-configured screens. No mock login success should be presented.
- **Cloud Sync & multi-device**: need real backend authentication, per-user RLS, change queues and conflicts, cloud deletion, cross-device migration, account separation. No data is in cloud at this time. Local browser storage can be cleared; JSON backups remain important.
- **Full latest CUT weekly averages/14-day observation/10-day adjustment rule** and complete safety exclusions: older Numbers-based review code still exists; must test under new version and not retroactively recalculate historical decisions.
- **Recovery safety automation** including comprehensive conditional warnings / medication review / menstruation & illness holds; currently a mix of educational UI and individual guard checks, not a clinically validated decision engine.
- **Training Session redesign** and official 3D GLB armored character/animation; imagery in Today remains a still visual reference, not live 3D.
- **Full localization**: English UI text translations are not complete. Appearance Follow System still needs full light-theme QA.
- **Complete ingredient quantity scaling and recipe photography**: macros adjust with servings when data complete; ingredient text still unstructured and does not yet change automatically.
- **Real browser notifications**: preferences can be stored, push service not configured.

## Safety and versions
- Preserve the existing local `STORAGE_KEY`, `schemaVersion` and backup/restore. Optional new fields allow legacy data.
- Do not silently overwrite old targets, plans, training records, nutrition entries or bodyweight history.
- Action results must never say "synced" unless cloud persistence actually succeeded.

## Next deployment acceptance
Run `npm run typecheck`, `npm test`, and `npm run build` under `app-source/`. Preview and manually test Onboarding both CUT/GAIN/safety, meal completion and historical snapshots, GAIN temp after 14 days, responsive Progress, Calendar/Nutrition confirmation. Then GitHub Pages publish action on main.
