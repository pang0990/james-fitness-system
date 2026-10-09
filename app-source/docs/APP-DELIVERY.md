# Web App → App

Current platform: Next.js static export, reusable TypeScript domain/state, responsive components, PWA manifest and icons, safe-area support.

PWA can be installed where browser installation is supported; iOS uses Add to Home Screen. Offline cache includes primary pages and compiled assets, then caches visited pages. An unvisited offline page shows an explicit offline page instead of invented content. App updates activate after existing tabs close; user local data is stored separately from cache.

Native packaging next: retain domain/content/UI; add Capacitor shell, replace storage adapter with native durable storage, configure native deep links and session handling, test keyboard/back navigation, implement notification permission only when needed. Server identity, RLS, migration and sync must be complete before claiming cloud or native account readiness.

Do not expose server secrets in static bundles. No backend session is faked by the local edition. Keep authentic records and immutable snapshots through storage migrations.
