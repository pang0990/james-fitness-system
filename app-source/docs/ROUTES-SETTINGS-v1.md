# JFS — Product Routes & Settings v1 (2026-10-13)

## Rules
- Four permanent tabs ONLY: **Today / Nutrition / Training / Progress**.
- Personal menu ONLY: **Profile / Knowledge / Data & Backup / Settings**.
- UI changes must preserve `james-fitness-v1` localStorage data, Nutrition Formula Engine, versioned targets and session history.
- Current runtime is a Next.js **static export on GitHub Pages**. Variable `/:id` paths cannot be rendered at build time; use fixed detail pages with a `?id=` query, or in-page selected details. All older URLs remain usable.
- New route aliases can render existing functional components. They are not evidence that missing backend or engines have been implemented.

## Current primary routes
| Route | Behavior | Status |
|---|---|---|
| `/today` | Cinematic Today, reminder queue, shortcuts and records | existing |
| `/nutrition` | Daily macros, meal and food records | existing |
| `/nutrition/foods` | Food search & user foods | existing |
| `/nutrition/recipes` | Recipe search/list | existing |
| `/nutrition/recipes/detail?recipe=<id>` | Opens an existing recipe detail sheet | supported if recipe exists |
| `/nutrition/meals` | Editable meal template | existing |
| `/training` | Training hub / session actions | existing |
| `/training/plan` | Editable existing plan | existing |
| `/training/plan/new` | Blank editable plan (does not overwrite current plan until saved) | implemented |
| `/training/plan/edit` | Existing plan editor | legacy-compatible |
| `/training/calendar` | Scheduling | existing |
| `/training/session` | Active session | existing; no dynamic session ID route |
| `/training/history` | Workout history | existing |
| `/training/history/session?id=<id>` | Falls back to history list; dedicated focus screen pending | entry point only |
| `/training/exercises` | Exercise library | existing |
| `/training/exercises/detail?id=<id>` | Falls back to exercise library; individual exercise deep link pending | entry point only |
| `/progress` | Overall progress | existing |
| `/progress/body` / `nutrition` / `training` / `recovery` | Detailed metric views | existing |
| `/progress/check-in` | Opens the existing weekly review engine | legacy-compatible |
| `/progress/check-in/history` | Opens Nutrition decision/version history | legacy-compatible |
| `/progress/training/exercises?id=<id>` | Falls back to training analytics; drill-down pending | entry point only |
| `/profile` | Existing editable Profile | supported |
| `/knowledge` | Searchable existing article collection | supported |
| `/knowledge/<known-article-slug>` | Existing articles, not arbitrary dynamically generated slugs | supported for built articles |
| `/data` | Backup/restore, CSV exports, local deletion | supported |
| `/settings` | Settings home | supported |

## Settings subroutes
| Path | Description |
|---|---|
| `/settings/account` | Account/Sync **status** (Google OAuth and Cloud Sync not yet live) |
| `/settings/general` | Region, timezone, 12/24h format and week start. Units kg/cm and zh-Hant currently fixed. |
| `/settings/appearance` | Dark / Follow System and Companion visibility preferences (full light visual QA pending). |
| `/settings/notifications` | Workout, missing logs, weekly check-in preferences. Missing logs controls Today; native/browser push pending. |
| `/settings/training` | Training experience, rest, auto rest, RIR, warm-up, previous sets, display behavior. |
| `/settings/nutrition` | Dietary profile, water target/quick-add. Nutrition target override remains in Nutrition plan flow. |
| `/settings/companion` | Character and animation preferences. Real armored GLB rig pending. |
| `/settings/accessibility` | Reduce Motion / Reduce Transparency. |
| `/settings/data-privacy` | Backup/privacy/delete links. |
| `/settings/about` | Application version and development status. |

Existing `/settings/profile`, `body`, `recovery`, `privacy`, `data` continue to work for compatibility.

## Data and privacy
- Preserve local record schema and history. CSV includes Body / Nutrition / Training / Recovery; summary exports exclude superseded Body and Food logs.
- Backups are JSON; restore validates schema and downloads Safety Backup before replacing.
- Local deletion requires two confirmations. Account deletion and cloud deletion cannot be presented as operational before a backend exists.
- Avoid claiming cloud synced after a local save; until cloud services are actually enabled, status is only local.

## Agreed but **not yet implemented**
- Real Google-only OAuth sign-in, session recovery, multi-device sync, encryption/RLS, conflicts and deletions.
- Five-step Onboarding screens and full CUT/GAIN Temporary safety decision engine.
- New fully validated Progress computation, CUT 14/10-day recommendations and GAIN 14-day qualification.
- Complete 129 published recipes and professionally validated 954-food seed catalogue.
- A rigged, live 3D full-helmet armored berserker and megacity environment.
- True `/training/exercises/detail`, `/training/history/session` and individual Progress exercise detail view.
- Full English localization; source docs specify it but current pages are not translated.

Do not silently change the existing Numbers 3.0 CUT coefficients or archived nutrition snapshots when implementing these deferred features. Review the source formulas and explicit user-approved newest rules before shipping any algorithm migration.
