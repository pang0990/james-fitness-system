# JFS Minimal · UI/UX and Settings audit · 2026-10-14

## User-requested changes implemented
- Minimal Today: remove the entire blank city/heading billboard; show a short date row instead. No "今天", WANDERER or motivational slogans. The Cinematic hero remains untouched.
- Nutrition: meal-name edit launches a compact native centered dialog (no giant bottom Sheet and no redundant "重新命名餐次" title). Name validation prevents empty/duplicate names. Current/future meals, snapshots, skipped entries follow the rename; historical records remain unchanged.
- Hide the Nutrition → "管理每日餐次" shortcut (legacy /nutrition/meals route is retained for compatibility; adding/recording/editing meals is not affected).
- Minimal Nutrition: correct input/select foreground contrast in light theme, remove 2077 dark-gold Cookbook tile and category shortcuts from the main Nutrition page. The dedicated Recipes page remains, but its hero, filters and card list use readable pale glass surfaces.
- Minimal Training/Progress: continue using shared minimal surfaces and consistent navigation; 2077 CSS untouched.
- Small edit popup uses accessible native modal behavior, visible label, Save/Cancel, Escape and backdrop close; themed in both Minimal and 2077.

## Settings — audit and what actually changed
| Area | Before | Now | Note |
|---|---|---|---|
| Settings landing | Flat 11+ items | Grouped into Account & Data, Personalization, Fitness; 8 direct settings links + About footer | Appearance remains primary entry |
| Appearance vs Companion | Duplicate "show Companion" toggle across screens | Companion settings link moved below Appearance as advanced 2077 controls; remains reachable | No preference deleted |
| Account vs Data & Privacy | Multiple backups links + cloud warnings | Account shows sign-in and one short on-device status; backup and export grouped under Data & Privacy | Login/Auth unaffected |
| Data & Privacy | Backup link + privacy + destructive link side by side | Single backup/export/manage link and privacy info. Data deletion remains behind /settings/data with dual confirmations | Historical data never deleted by redesign |
| Apple Health | Visible unfinished integration | Hidden from top-level navigation; deep link still exists | No data source integration yet |
| Notifications | System push and weekly reminders shown though not implemented | Only operable in-app missing-log reminder displayed; future preference values retained in storage | No push promises |
| General | Region / week start / time format not fully supported | Only working timezone setting shown for now; previous values preserved in existing preferences | Do not claim full locale support |
| About | Repeated cloud-status warning | Simple app version & privacy link | No duplicated warning |
| Companion | Long implementation details and redundant Accessibility link | One short clarification | Motion safety remains active |
| Backup and Privacy sub-pages | Redundant triple sub-navigation + generic description | Removed repetitive sub-navigation and filler line | Back links remain possible through app header |

## Still to review
- The legacy /nutrition/meals dedicated editor remains reachable by old URLs; requires separate product decision before removal. It offers adding, ordering, deleting slots and should not be removed without explicit consent.
- Advanced Training preferences remain numerous; each should be evaluated against actual usage before hiding controls.
- 'DataTools' and /settings/data still have multiple export options. Review naming and de-duplication in a future safe pass, not as part of this UI cleanup.
- Manual real-device screenshot verification across Nutrition, Training, Progress, Recipes and Settings is still necessary after CI and deployment.
- Supabase cloud sync is not implemented; no data migration was performed.

## Safety and verification
- Changes only affect presentational components/settings navigation; existing workout/nutrition formulas, records, account storage and PKCE OAuth are untouched.
- CSS additions use data-visual-style=Minimal selectors, other than the shared compact meal rename dialog.
- CI: TypeScript, tests, static build. Manual visual QA still required.
