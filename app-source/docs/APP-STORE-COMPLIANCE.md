# App Store readiness audit

Status: **buildable foundation, not submission-ready yet**.

## Current structure that is aligned

- The product has substantive tracking, planning, progress and decision workflows; it is not intended to be a marketing web clip.
- The app can operate locally without mandatory sign-in.
- Cloud Sync is optional.
- Main navigation is app-like and task-oriented.
- Account creation is not required before the user can understand the product.
- Account deletion can be initiated inside Settings → Account & Sync.
- A public privacy page and support page are included.
- A privacy-manifest source file is included for the generated iOS target.
- Health/fitness data is not used for advertising or tracking.

## Must be completed before submission

1. Generate the Capacitor iOS target and copy `native/PrivacyInfo.xcprivacy` into the app target.
2. Run Xcode Privacy Report and reconcile all SDK manifests / Required Reason API entries.
3. Deploy the Supabase `delete-account` Edge Function and verify full account + user-state deletion.
4. Configure a stable public Privacy Policy URL and Support URL in App Store Connect.
5. Complete App Privacy answers for email, user ID, health, fitness and user content actually collected by the submitted build.
6. Confirm no health/fitness data is used for ads, marketing data mining or data-broker sharing.
7. Add final App Icon, launch assets, screenshots, age rating, category and review notes.
8. Test physical devices: safe area, keyboard, offline behavior, WebGL fallback, account deletion, sync conflicts and reduced-motion/transparency settings.
9. Make sure the native build delivers durable app utility beyond a simple website wrapper. The local-first workflow, persistent workout mode, account sync, offline records and Companion experience should be demonstrated in review notes.
10. If third-party/social login (Google, Facebook, etc.) is added later, re-check App Review Guideline 4.8; email/password-only auth does not trigger that third-party-login requirement by itself.

## Account deletion

The UI now initiates permanent account deletion. The server-side deletion endpoint must use a service-role key only inside the Supabase Edge Function; never expose that key to the client.

## Privacy manifest scope

The checked-in manifest declares:
- name
- email address
- user ID
- health data
- fitness data
- other user content

as linked to the user when Cloud Sync is used, not used for tracking, for app functionality and relevant personalization.

The final generated iOS build still needs Xcode privacy validation because third-party SDKs may contribute their own manifest entries or Required Reason APIs.
