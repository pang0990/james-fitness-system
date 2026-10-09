# James Fitness System

Mobile-first fitness Web App. Next.js + TypeScript + Tailwind. Installable PWA with responsive black / white / gold interface.

## Current working features

- Today: one priority reminder, interactive Companion, Nutrition → Training → Water → Recovery.
- Three-step profile setup, source-matched CUT calculation, confirmed plan versions, shared daily targets.
- Nutrition sheet flow, manual P/C/F, meal corrections, custom foods, bilingual category lists and portion preview.
- Food library: 78 James entries + 852 TFDA raw-food entries. Provenance and licenses in `docs/FOOD-SOURCES.md`.
- User-confirmed training cycles, warm-up/workout/review flow, focused exercise logging, working/warm-up/ramp-up/RP/drop segments, RIR, rest timer, manual Cardio.
- Individual trend charts for body/nutrition/training/recovery with detail views, exercise-specific performance, weekly review, Accept/Keep and immutable nutrition versions.
- Knowledge: three complete articles provided by James, searchable full-text reading and original reference text.
- PWA icons/manifest, safe-area layout, reduced-motion support, offline cache and real local data persistence.

## Run and verify

```sh
npm ci
npm run dev
npm test
npm run typecheck
npx playwright install chromium
npm run test:e2e
npm run build
```

Development: http://127.0.0.1:3000 . Build output: `out/`.

Inside the published repository's `app-source/`, run `npm run pages:prepare`, then review, commit and push the repository. This builds the `/james-fitness-system` path and updates root Pages assets.

## Remaining final-product work

Cloud accounts, Supabase database/RLS, cross-device synchronization, verified backup restore, native App Store packaging, approved safety/GAIN rules and detailed training content. No cloud login, medical validation, or native distribution is implied by PWA installation.

Personal data currently stays in the browser and can be exported in Settings. Existing records use the same storage key across the URL rename. Never commit personal exports, source Numbers files, .env values or credentials.

Architecture: `docs/ARCHITECTURE.md`. Formula audit: `docs/FORMULA-AUDIT.md`. Current release: `docs/RELEASE-0.2.md`. App migration: `docs/APP-DELIVERY.md`.
