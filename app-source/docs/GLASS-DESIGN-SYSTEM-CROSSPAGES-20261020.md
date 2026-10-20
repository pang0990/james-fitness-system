# Glass Design System 2.0 — three-page migration
Date: 2026-10-20 | Status: Draft review (not published).

## Real migration scope

The original JFS Apple-inspired Minimal mode uses a black canvas and near-white translucent glass. The approved translucency and safety settings are **not changed** here.

- **Nutrition:** `NutritionDashboardV3` uses shared `GlassCard`, three `GlassProgress` components and `GlassButton` connected to the unchanged Add Food flow. The real meal list panels use `GlassCard`, the four shortcut buttons `GlassButton`; existing Quick Macro, manual corrections, recipe links, target calculations and Cinematic fallback stay.
- **Training:** the main plan/ongoing session summary and today's completed-session card now use `GlassCard`. Start-plan and add-an-extra-workout actions use `GlassButton` or the glass link class, preserving existing `start`, `startPlannedSecond`, `setExtraOpen` and links. Active workout sets, timer, rest, training models and cycle logic are untouched.
- **Progress:** trend hero, photo placeholder, stats, Review, system status and training evidence share `GlassCard`; period control uses real `GlassNavigation` with the same 7/30/90/365-day state and range/filter calculations. Photo upload is still unavailable; no placeholder stock imagery or fabricated metrics introduced.

## Incremental CSS consolidation

Material behavior for migrated `.jfs-glass-card` surfaces is now centralized in **`glass-system-v2.css`**, loaded last with a single opt-in Minimal scope, rather than per-page copies. Deleted duplicate material definitions from the Nutrition dashboard CSS. Legacy `reference-v3.css`, `glass-experience-v4.css` and `glass-black-crystal-v5.css` remain for backward compatibility across non-migrated screens; CSS refactor is **partial, not complete**.

The shared material remains white (93% surface opacity, 95% control, 96% raised), not smoky gray, and uses translucent white `rgba` + backdrop blur with hard white/blur-free fallback when transparency is reduced. Most body and safety alerts retain their previous semantics.

## QA gates

- TypeScript, unit tests, Next.js static export.
- Playwright: 390/1440px Nutrition dashboard, food-adding entry, Training plan, Progress 6 cards and period switch, horizontally scroll-free layout, white glass computed style, Reduce Transparency and all existing 43 tests.
- Screenshot review for all six cross-page views.
- True Safari on iPhone, VoiceOver, browser memory/performance under repeated scroll/blur and genuine Google auth/local record backup before merging/deploying.

## Explicit non-goals

No new fitness algorithm, no changes to CUT/GAIN target constants, training program prescription or other domain rules; no Supabase/database migration; no new photo upload or recipe values; no silent deployment of public main/GitHub Pages. This design PR should remain Draft until visual and device acceptance.
