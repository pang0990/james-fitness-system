# Native iOS wrapper

James Fitness remains a Next.js static export. The native shell should use Capacitor so the web product and App Store build share one UI and domain layer.

## One-time setup

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap add ios
npm run build
npx cap sync ios
npx cap open ios
```

Capacitor reads `capacitor.config.json` and copies `out/` into the iOS project.

## Before App Store submission

- Replace the placeholder bundle identifier if the final Apple Developer identifier differs.
- Configure signing/team in Xcode.
- Add final app icons, launch assets and privacy usage descriptions for any native capability actually used.
- Test sign-in, Supabase sync, offline fallback, keyboard/safe-area layout, reduced motion and WebGL fallback on physical devices.
- Create the App Store Connect record, screenshots, privacy answers and review notes.
- Do not claim health/medical diagnosis; the product remains fitness tracking and educational guidance.

The repository intentionally does not include signing certificates, provisioning profiles, Apple account credentials or a fabricated App Store submission.
