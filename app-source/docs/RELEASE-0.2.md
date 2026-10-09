# Product interface update · 2026-10-09

- Active repository and URL renamed to james-fitness-system. Existing Git history retained; no old website assets in current tree.
- Today is one reminder, Companion, Nutrition, Training, Water, Recovery. Removed slogans and storage tutorial from home.
- Nutrition uses the same plan/day resolver as Today, including migration fallback for a diary created before an initial plan.
- Food selection is category → searchable bilingual list → portion → meal. 78 translated James foods and 852 TFDA raw-food snapshots. Missing official values never become zero.
- Cycle is user-confirmed, with ordered named days independent of weeks. Completion/explicit skip advances; time passing does not. Workout has warm-up, exercise focus, set segments, review. Existing sessions remain readable.
- Progress has individual real-data charts and drill-down records; missing observations remain missing. Exercise weight/reps/RIR are separated by exercise.
- Three complete user-provided articles imported. Incomplete retrieved documents excluded. Reference text retained; unresolvable ChatGPT citation markup removed, not replaced by invented links.
- PWA manifest, icons, standalone layout, safe-area padding, service worker, reduced-motion support. This is an installable Web App foundation, not an App Store binary.

## Still incomplete for final cloud product

Supabase Auth, cloud database/RLS, cross-device synchronization, tested backup restore and native distribution. Content that needs further material remains empty rather than filled with demo data. Detailed training prescriptions, GAIN adjustment engine, pain rules and final nutrition safety thresholds require approved definitions.

Local storage remains per browser and is disclosed in Settings. Moving URL paths within this GitHub Pages origin preserves the existing storage key. No user health records are uploaded by this release.
