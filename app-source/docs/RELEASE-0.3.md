# James Fitness System 0.3 — 2026-10-09

Visual Direction v2.0: obsidian, champagne gold, restrained ambient lighting. One token-based stylesheet; page-specific visual intensity. Compact desktop rail, mobile glass dock, native View Transitions with reduced-motion fallback. Procedural Three.js / React Three Fiber Companion with state-driven poses, blink, pointer look, floor and light ring; SVG fallback when WebGL unavailable.

## Delivered
- Today / EAT / TRAIN / DAILY STATUS; notice queue with auto rotation, pause, swipe, priority eligibility notice.
- Meal-first logging; James Foods / My Foods / Quick Macro / Recipes. Persistent editable meal names/order, historical meal snapshots remain visible. Macro-to-quantity calculation for P/C/F with zero-nutrient fields disabled.
- Original 78 James foods retained. TFDA 852 raw + 22 prepared records. USDA official API cooked chicken breast and pork loin snapshots. Unified picker with source metadata inside details only.
- User-authored searchable recipes, ingredients, instructions, serving macros and meal insertion. No invented James recipes.
- Editable versioned training cycles, PPL / Upper-Lower / Chest-Back-Legs-Shoulders-Arms; adjustable recurring rest pattern and full-month calendar, date swap, temporary rest. Schedule independent from nutrition day type.
- 45 initial exercises: free weights, generic machine/cable, verified Hammer Strength and Newtech entries. This is an initial library, not either manufacturer's complete catalogue. Exercise videos remain null.
- Muscle working-set targets, frequency, priority and cycle allocation, priority sorting; direct-primary working-set counts only. RP/drop remain linked segments, not additional working-set credit.
- Warm-up selection/preset/session snapshot; focused workout, opt-in RP/drop, persisted selected exercise, timer and completion screen.
- Progress direction / review / four diagnostic rows / performance evidence. Individual detail charts stay below detail pages, with independent date filters.
- GAIN v1: 14-day baseline, minimum 10 complete food days and 5 weights in each week, weekly means, level ranges, +1g/kg initial step (explicit suitability confirmation), ±25g subsequent changes, 7-day observation and 14-day review spacing; no TDEE. Protein/fat adequacy, adherence and recovery are explicitly self-confirmed rather than fabricated scores. Decisions preserve snapshots; accepted nutrition versions activate next day.
- Training intensity evidence and optional frequency review, user-edited allocation preview, Accept/Keep; accepted training version activates after current cycle's events complete.

## Important remaining boundaries
- Local browser storage/PWA only; no Supabase accounts or multi-device sync yet. No native App Store binary.
- No automatic high-BMI or pain-level prescription; those rules still need approved definitions. CUT arithmetic remains source Numbers logic.
- Training performance evidence currently compares last two comparable sessions per exercise, labelled as such; a complete cross-cycle trend engine and secondary-muscle/RP/drop/unilateral volume-credit rules are not claimed.
- Unavailable content (James recipe collection, exercise/warm-up videos, premium character GLTF) is not represented by fabricated content.
- New GAIN 50g exception is not an automatic rule. Baseline correction uses the conservative 25g step. Stable baseline start requires user confirmation that current carbohydrate intake fits James start conditions.
