# James Fitness System — Monochrome Experience 2.0

**Status:** review branch only · 2026-10-19 · no deployment.

## Product direction

Apple-inspired discipline, NOT a copy of Apple assets. Use **black / white / grey only** for brand styling: more deliberate hierarchy, tactile depth, measured materials, refined short interactions. No gold, blue primary buttons, armor, character, sci-fi backdrop or decorative 3D mesh in the current Minimal redesign.

The existing Cinematic option and its assets are preserved for backwards compatibility, not presented as the target visual design.

## Built in this slice

- New late-loaded `src/app/monochrome-experience-v2.css`: clear elevation tokens, ambient neutral light, surface highlights, raised/sunken controls, strong focus ring, black/white actionable controls, selection states, floating dock.
- Minimal light **and** dark palettes remain grayscale. Nutrient and water bars use shades instead of new accent hues. Error/safety warnings can retain semantic affordances.
- Today: stronger hierarchy/depth on priority queue, summary cards, water actions and interactive ring. In Minimal, redundant lower Training CTA is visually hidden; action queue retains the primary workout action, and Training label remains linked. Cinematic layout and actions untouched.
- Nutrition: original calorie and macro **percentages** passed through as `--jfs2-fill` variables and used for grayscale conic gradients. Existing data calculations and Cinematic inline gradients remain identical. Large rings reduced on mobile without dropping totals or macro numbers.
- Training: raised workout controls and subtle exercise icon surfaces, while ongoing workout recording logic is unchanged.
- Progress: shortened empty chart state and added a Body entry link when there are fewer than two weight measurements; missing trends remain missing.
- Animations: lightweight first-content entrance, pressed-button feedback and progress-track changes; compositing primarily transform and opacity. Disabled for `prefers-reduced-motion: reduce` or in-app `data-reduce-motion=true`. Disable translucency with in-app preference.
- Four Playwright screenshots/checks: mobile Today, mobile Nutrition, desktop Progress and dark mobile Today, plus no horizontal overflow and expected grayscale styles.

## Visual tokens

| Token | Light | Dark |
|---|---|---|
| Ink | `#19191b` | `#f5f5f7` |
| Base | `#f4f4f6` | `#111113` |
| Elevated surface | white/light pearl | charcoal |
| Main action | white on near-black | dark on near-white |
| Progress | grayscale fill, data value unchanged | grayscale fill, data value unchanged |
| Borders | subtle dark grey | subtle white |
| Motion | 180–560 ms, natural easing | same / disable on request |

## Non-goals and release gates

This slice **does not** finalize all screens. No new 3D models are created: the dimensional feeling comes from surfaces and perspective cues, rather than unnecessary GPU-heavy scene rendering.

Still required before release:
1. Review **actual CI screenshots** at mobile and desktop; specifically inspect iPhone Safari browser toolbar/safe-area dock overlap. Chromium mobile simulation is not equivalent to iPhone Safari.
2. Verify real OAuth and logout, Supabase permissions, backups and imports, nutrition formulas and ongoing workout UX in separately authorized safe environments.
3. Complete remaining P0 safety policy and migration review.
4. Check every settings, recipe, modal and long-form progress screen, including VoiceOver/Dynamic Type and CSS contrasts.
5. Expand interaction motion only where meaningful; a persistent 3D character is not in this visual phase.
6. Manual QA at 375, 390, 430, 768, 1440 px and system/theme/accessibility states.

**No production data, Supabase schema, fitness rules, OAuth code, or deployment changed.**

Rollback: remove the final stylesheet import in `src/app/layout.tsx`, and revert the tiny Nutrition/Progress presentation-only additions; existing Minimal/Cinematic CSS remains.
