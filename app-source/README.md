# James Fitness System

Mobile-first fitness Web App. Next.js + TypeScript + Tailwind. Installable PWA with responsive black / white / gold interface.

## Current release: 0.3

Visual Direction v2.0, procedural 3D Companion, meal-first logging with editable persistent meal names, searchable bilingual foods and cooked portions, macro-to-quantity calculation, recipe authoring, versioned training cycles with monthly scheduling, warm-up presets, focused workouts, GAIN v1 review and versioned Accept/Keep.

See [Release 0.3](docs/RELEASE-0.3.md) for scope and explicit remaining boundaries; [Visual System](docs/VISUAL-SYSTEM.md) for tokens and motion. Knowledge retains three complete James articles.

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

Cloud accounts, Supabase database/RLS, cross-device synchronization, verified backup restore, native App Store packaging, approved safety and advanced volume-credit rules, full exercise/video/recipe content. No cloud login, medical validation, or native distribution is implied by PWA installation.

Personal data currently stays in the browser and can be exported in Settings. Existing records use the same storage key across the URL rename. Never commit personal exports, source Numbers files, .env values or credentials.

Architecture: `docs/ARCHITECTURE.md`. Formula audit: `docs/FORMULA-AUDIT.md`. Current release: `docs/RELEASE-0.2.md`. App migration: `docs/APP-DELIVERY.md`.
