# Glass System 3.0 — Quality Gate / Batch 1
Date: 2026-10-20 · Review branch only (not deployed).

## Existing production baseline
- GitHub Pages live: `/today/`, `/nutrition/`, `/training/`, `/progress/`.
- Existing 50 Chromium UI checks and domain tests remain intact.
- Actual private account data is currently browser-scoped. Do **not** use fake browser-login E2E checks as evidence of true Google OAuth, cloud sync or Supabase RLS.
- CUT/GAIN/Numbers rules, recipes, workout logging, auth configuration, stored personal records and PWA offline caching strategy are **not changed by this patch**.

## Implemented in this batch
1. **Mobile browser chrome and installed PWA:** Minimal Glass uses a near-black `#030304` canvas whether light/dark mode is selected, so its dynamic `theme-color`, initial Next viewport theme color and manifest splash/theme colors must match that canvas. Cinematic preserves its original light/dark colors.
2. **GlassSheet accessibility and state stability:** keep a stable effect when parent components rerender and `onClose` identity changes. Preserve body scroll lock until dismissal, focus inside the dialog with Tab/Shift+Tab and `focusin`, close on Escape/backdrop and restore focus to the opener on unmount. Never write account records from a UI dismissal callback.
3. **CSS ownership:** move the developer-only Live Glass Lab styling out of `glass-system-v2.css` and into the existing Showcase stylesheet, imported only by the Showcase route. The user-facing base shared glass styling remains loaded from RootLayout. Production Pages preparation continues to omit the Showcase HTML route.
4. **Regression coverage:** mobile theme and actual PWA manifest, modal keyboard confinement, safe water save/reload, developer CSS isolation; all previous UI and unit tests still run.

## Acceptance
- `npm ci && npm run typecheck && npm test && npm run build`.
- Complete browser QA against 375, 390, 430, 768, 1024 and 1440px within existing/new tests, with black/white glass and disabled-transparency.
- No page overflow or unexpected styles in Today/Nutrition/Training/Progress; QA screenshots.
- Check real iPhone Safari, voice-over, toolbar, viewport-safe-area and keyboard before shipping a subsequent release.
- True multi-device/login/backup/restore validation is **not** covered by synthetic Supabase session tests.

## Next proposed batches
- Batch 2: prioritize meal search and editable portions (Nutrition), active set timer and workout input (Training), chart empty states and data-backed trends (Progress); no domain rule changes without approval.
- Batch 3: simplify remaining legacy CSS layers incrementally with computed-style screenshot baselines, rather than removing `!important` declarations blindly. Measure payload and iPhone blur compositing. Establish actual account export/restore smoke in a safe test environment.
