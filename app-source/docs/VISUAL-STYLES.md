# JFS Visual Styles — 2026-10-14

The existing 2077 / Cinematic artwork, CSS, and screen structure are kept intact.

A separate `minimal-theme.css` (imported LAST in layout.tsx) overrides appearance only when `html[data-visual-style="minimal"]`. It is Apple-inspired, not an Apple product clone: system typography, light gray page, white elevated surfaces, blue primary actions, compact Today hero and neutral typography. The 2077 imagery is suppressed only in Minimal, not deleted. No fitness algorithms, routes or personal records are modified.

## Switching
Settings → Appearance → Visual Style: Minimal / 2077 · Cinematic. Light / Dark / Follow System are separate preferences (Cinematic defaults to Dark when selected); all fields remain on `state.appearance`. Older saved states without `visualStyle` open Minimal Light and remain valid. Choose Cinematic to restore the original. Preferences use existing per-user localStorage and aren't cross-device synced.

## QA
- Existing login, nutrition, training, progress and settings must still function.
- Toggle Minimal ↔ Cinematic, refresh, confirm persistence.
- Toggle light/dark/follow-system in Minimal; confirm readable text and actions.
- Test Today, Nutrition, Training, Progress, Settings on narrow iPhone and desktop.
- Clear neither localStorage nor users' records; cloud sync remains deferred.
