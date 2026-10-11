# James Fitness System — design audit 2026-10

This audit compares the current product direction with Hevy, Fitbod, MacroFactor, WHOOP and Apple platform guidance.

## Comparable-product patterns

### Hevy
- Keep workout logging extremely direct.
- Separate reusable Routine/Plan from the actual Workout Session.
- Allow Start Empty Workout.
- Show previous performance, rest timer, set types and exercise history close to the active workout.
- Exercise library is searchable and custom exercises are allowed.
- Supports mobile, web and wearables without changing the core mental model.

### Fitbod
- Reduce planning friction with a ready workout, but preserve Quick Edits.
- Put duration, exercise actions, replacement/reordering and videos close to the workout context.
- Use recent training/recovery data to turn logs into the next decision.
- Progress is layered: overall → muscle → exercise.

### MacroFactor
- Daily intake and targets are visible first.
- Weekly/monthly interpretation lives above raw data.
- Dashboard is configurable and progressive-disclosure is preferred over an all-metrics wall.
- Food logging remains a fast primary workflow.

### WHOOP
- Home prioritizes today’s state and next action.
- Deep metrics live one level down.
- Trends are paired with a plain-language interpretation.
- Daily check-ins/journal entry should be quick and contextual rather than forcing navigation into a data-management page.

## James decisions after audit

1. Keep four top-level tabs: Today / Nutrition / Training / Progress.
2. Keep secondary libraries, setup, history and Knowledge out of the primary tab bar.
3. Today remains the daily control center and quick-entry surface.
4. Training Plan and active Workout remain separate domain objects.
5. Add Start Empty Workout; a plan must never be required to log a real session.
6. Templates are optional presets and remain editable/mixable.
7. Progress uses Outcome → Interpretation → Training Evidence → Decision, with raw metrics one level deeper.
8. Glass belongs primarily to navigation, menus, sheets and compact controls. Content surfaces are dark standard materials.
9. Cyberpunk lighting is environmental ambience, not a neon border on every card.
10. Gold is the semantic primary accent; violet/blue light is low-intensity atmosphere.
11. Motion communicates navigation hierarchy, save state and workout immersion, rather than continuously animating every metric.

## Mobile / web navigation

Mobile:
- floating four-tab dock
- tab state preserved while navigating within each domain
- immersive workout may hide the dock
- sheets for brief actions only

Desktop / web:
- same four-domain information architecture
- compact left rail
- deeper views retain their parent domain
- no duplicate Knowledge/Settings entries in primary navigation

## Do not copy competitors literally

The familiar interaction grammar should match international fitness products, but James remains differentiated by:
- combined Nutrition + Training + Progress decision loop
- rule transparency and plan versions
- no TDEE product stance
- Training Cycle / plan history
- explicit Accept / Keep recommendation control
- optional local-only mode
- high-tech black/gold Companion layer
