# Supabase account + sync

The app remains local-first. Cloud sync activates only when both public Supabase environment variables are present.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Configure:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Build and deploy.
5. Open Settings → Account & Sync.

The browser keeps a local copy for offline use. When signed in:
- startup reconciles the local revision with the user's cloud row;
- local saves are pushed after the local transaction succeeds;
- manual Sync Now can pull a newer cloud revision;
- Row Level Security limits each row to `auth.uid() = user_id`.

## Conflict behavior

Revision numbers are preserved in the state snapshot. A newer cloud revision is preferred during startup/manual reconciliation. This is a first cloud beta and is not a collaborative real-time editor; concurrent edits from two devices still need product-level conflict UX before broad release.

## Security boundary

Only the anon/public key belongs in the client. Never place the service-role key in the web app. RLS must remain enabled.
