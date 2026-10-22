import type { OfflineTrainingDatabase } from "./protocol";
import type { Session } from "../training-core/types";
import { validateTrainingSessions } from "../training-core/validation";

export type VerifiedRemoteSession = {
  session_id: string;
  revision: number;
  session: Session;
  written_at: string;
};
/**
 * Only hydrate a brand-new local Session. Never overwrite an offline draft,
 * an unsent command, or a previously imported snapshot.
 * Existing-state conflict resolution is an explicit future operation.
 */
export async function importVerifiedRemoteSession(
  db: OfflineTrainingDatabase,
  ownerId: string,
  remote: VerifiedRemoteSession,
): Promise<boolean> {
  if (!ownerId ||
      remote.session_id !== remote.session.id ||
      !Number.isSafeInteger(remote.revision) || remote.revision < 1 ||
      !Number.isFinite(Date.parse(remote.written_at)) ||
      remote.session.setDrafts !== undefined ||
      remote.session.cycleCounted !== undefined) {
    throw Error("Invalid or unauthorized Training snapshot import");
  }
  validateTrainingSessions([remote.session]);
  return db.transact(async tx => {
    const prior = await tx.getSnapshot(ownerId, remote.session_id);
    const pending = (await tx.listCommands(ownerId))
      .some(command => command.sessionId === remote.session_id);
    if (prior || pending) {
      // No best-effort merge: local data takes precedence until a separately
      // verified, user-visible conflict resolution is implemented.
      throw Error("Local Training already exists; explicit reconciliation required");
    }
    await tx.putSnapshot({
      ownerId, sessionId: remote.session_id,
      serverRevision: remote.revision, localSequence: 0,
      payload: structuredClone(remote.session),
      updatedAt: remote.written_at,
    });
    return true;
  });
}
