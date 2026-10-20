# James Fitness — Glass Experience V4
**Status:** Review-only PR; do not ship to main before screenshot approval.

## Visual reference
Inspired by the user's iOS Control Center image. Not a literal clone: smoked translucent layers, clear frosted layers, smooth floating shadows, a thin specular top highlight, luminous edge, softly diffused grayscale content behind the glass.

## Visible design, implemented
- `/ui-showcase/` in the local/test build now defaults to **深色玻璃**, with buttons for **霧白玻璃** and **原本霧面**. All controls render actual React UI components; no images are used as a stand-in for functioning controls.
- In Minimal app routes, the four-tab shell uses a static grayscale ambient scene; sidebar, header, and bottom dock use the strongest frosted treatment and remain legible.
- Today 3.0 main cards, glass controls and notification capsule; Nutrition 3.0 ring/card and meal area; first-pass Training and Progress hero cards use lighter glass. Not every text or input element is forced to be transparent.
- Shared light/dark physical-glass CSS variables live in `tokens-v3.css` and material compositions in `glass-experience-v4.css`. Existing health/domain/store code untouched; Cinematic and workout-active shell deliberately excluded.
- The glass does not scroll/parallax/animate constantly. Press/reduced-motion behavior remains from DS3.

## Contrast / accessibility and performance
- Keep numerals and important text on the same high-contrast black/white ink tokens; do not turn medical/safety notifications into decorative translucent blocks.
- `[data-reduce-transparency="true"]` and CSS `prefers-reduced-transparency: reduce` disable backdrop blur with opaque surfaces. Unsupported browsers get opaque fallbacks.
- Static background mesh, no video textures, no WebGL, minimal hero element blur. Phone blur may be reduced if real iPhone GPU profiling suggests it.
- Verify on actual iPhone Safari at 375/390/430px, then on large desktop; Playwright Chromium CI is not a substitute for that real Safari assessment.
- The UI Showcase remains excluded from `prepare-pages.mjs` public static output and is never a store of user/private content; source repo is public.

## Acceptance gates
1. Confirm three showcase variants look physically distinct, with real blur and visible edges.
2. Check app shell plus Today/Nutrition/Training/Progress 390/768/1024/1440px, light/dark.
3. Exercise buttons, food-entry flow, water saves, accessibility, reduced-transparency, reduced-motion, offline fallback.
4. Verify old synthetic-account browser QA and production build. No actual production release until accepted.

## What is not being claimed
No new nutritional formulas, no redesign of deep Training/Recipes or end-to-end account sync, no real Apple-branded Liquid Glass framework, no production deployment.
