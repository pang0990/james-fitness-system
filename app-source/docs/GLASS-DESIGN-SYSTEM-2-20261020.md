# James Fitness | Glass Design System 2.0
Date: 2026-10-20
Status: **Draft implementation for visual approval, not a deployed release**.

## Approved direction
Near-black canvas `#030304` with **bright white translucent glass** (main 93% white alpha, raised 96%, controls 95%), illuminated rims and soft shadows, dark text inside, white page labels outside. No smoky dark-gray cards and no gold. Glass does not exist just to be decorative; user controls must stay clearly tappable.

## Implemented shared React components
- `GlassCard`: reusable semantically labelled surface, base/raised layers.
- `GlassButton`: tactile primary/secondary/quiet press states, busy/disabled, minimum 44px targets.
- `GlassInput`: labelled 16px form entry, focus ring and white material.
- `GlassProgress`: real data-driven progression, reuses `UiProgressTrack` accessibility and existing selectors. Animates after actual input changes.
- `GlassNavigation`: keyboard/touch friendly pressed-state segmented navigation; used in the developer UI Lab.
- `GlassSheet`: portal modal with keyboard Escape, focus cycling, initial focus, previous focus restoration and body scroll lock. Mobile bottom edge safe-area; desktop centered. Water editing uses existing `save` and records.
- Extra `GlassNavLink` primitive for future normal routing.

## Today high-fidelity implementation
The six existing content cards (Focus, Nutrition, Training, Water, Recovery, Quick Log) now use `GlassCard`. Water quick-add, recovery and quick log buttons use `GlassButton`; water uses `GlassProgress`. Editing total water opens `GlassSheet` containing a labelled `GlassInput`; it saves using the **existing** difference-entry method; no data or formula migration.

The Today primary training link and Nutrition inline modal deliberately preserve their existing routes and behavior. Other flows are not redesign scope in this batch.

## Design inspection / user-facing evidence
`/ui-showcase/` in local/test builds contains a complete working example using all six components: water progress, +250ml, real selection and text entry, click/keyboard-open modal, responsive side-by-side desktop and stacked mobile cards. This uses **synthetic sample data** and does not touch real user storage. The developer-only page is omitted from the public GitHub Pages copy by `prepare-pages.mjs`.

Playwright browser QA uploads these latest actual screenshots:
- `glass-ds2-showcase-desktop.png`
- `glass-ds2-sheet-mobile.png`
- `glass-ds2-today-390.png`
- `glass-ds2-today-1440.png`

## Motion spec and performance constraints
- Press feedback: 155ms transform+shadow, not a global reflow animation.
- Progress: 460ms width interpolation after real numeric changes.
- Sheet: 270ms one-time enter animation; no continuously animated glass layer.
- System/in-app Reduce Motion removes animations; Reduce Transparency switches glass to opaque white and disables blur.
- Real iPhone Safari/GPU compositor/VoiceOver need manual device QA. Chromium Playwright does not validate iOS hardware performance.
- No runtime 3D/WebGL added.

## Release gates and long-term code health
- CI production build, typecheck, unit and full UI smoke; actual local/test browser screenshots against black+white glass reference.
- Test 390/1440 and later 375/430/768/1024 and text zoom, no dock overlap, keyboard accessibility, save/reload and invalid input.
- Not yet solved: older multi-layer CSS architecture (many `!important` overrides). **Do not claim CSS consolidation is complete**; migrate toward semantic tokens and components in safe batches rather than removing legacy CSS wholesale.
- Do not deploy/merge before explicit user review and approval; Supabase, Google OAuth, CUT/GAIN formulas, local account records, nutrition and training behavior unchanged.
