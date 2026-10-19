# James Fitness System — Design System 2.0 / foundation pass

Status: **Draft / non-production** (2026-10-19)

## Intent

Apple-inspired information hierarchy + JFS black/white/gold identity + subtle purposeful motion. Preserve existing Minimal and Cinematic modes, all features and all fitness rules. This pass does **not** build the premium armored character, restructure Today, or turn unfinished database features on.

## Current safe slice

`src/app/design-system-v2.css` loads after `minimal-theme.css`, using two opt-in selectors:

- `data-visual-style="minimal"`
- `data-theme="light"`

Only **Minimal light** action color, active bottom navigation, focused controls, and an additional minimum dock hit area are themed. No broad CSS rewrite, no changes to Cinematic or Minimal dark. Remove this stylesheet import to roll back the design without touching content, records or calculations.

### Semantic foundations

| Role | Value | Meaning |
| --- | --- | --- |
| Primary ink | `#1d1d1f` | body / labels |
| Action / focus | `#78591f` | dark gold on white; white text on dark gold |
| Warm gold highlight | `#a98a4c` | border / detail only |
| Selected wash | `rgba(120,89,31,.085)` | selected dock |
| Control radius | `14px` | main action |
| Card radius | `22px` | large surface |
| Minimum interaction target | `44px` | touch baseline |

Keep data semantics independent: water blue, protein green, carbs blue-violet, safety warnings their own status colors. Gold is **brand identity**, not a replacement for every chart color.

## Acceptance gates before merge

1. Verify light-mode screenshots for Today, Nutrition, Training and Progress at mobile widths 375 / 390 / 430, iOS Safari, and desktop 1440. Explicitly inspect fixed dock and safe-area padding.
2. Confirm all main actions, input focus states, active tabs, labels and error messages have visible contrast; do not judge accessibility from brand palette alone.
3. Confirm no regression in local records, workouts, nutrition plans, backup/restore, or Google sign-in.
4. Check reduced-motion and reduced-transparency settings; this slice intentionally adds no animation.
5. Confirm Cinematic/2077 and Minimal dark are unchanged.
6. Complete P0 approval (safety-rule audit and protected data migration) **before** any production release.

## Next slices (not implemented here)

- Today prototype: one priority action, current workout summary, nutrition/recovery quick actions, premium character only after real asset and animation budget are approved.
- Nutrition: compact macro row, preserving missing-data honesty, editorial recipes and structured ingredients.
- Training: uninterrupted set entry, timer clarity and session progress; avoid forced UI changes mid-workout.
- Progress: data-aware empty states, period filters and accessible charts.
- Motion: button feedback, navigation and data transitions with `prefers-reduced-motion` and low-end fallbacks.
- Minimal dark: separate contrast-verified palette.

No formula, persistence, Supabase, schema, content or production deployment changes in this PR.
