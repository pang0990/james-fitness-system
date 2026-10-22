import type { Session } from "../training-core/types";
import { validateTrainingSessions } from "../training-core/validation";

export type OfflineCommandStatus = "pending" | "conflict" | "rejected";
export type LocalTrainingSnapshot = {
  ownerId: string;
  sessionId: string;
  serverRevision: number;
  localSequence: number;
  payload: Session;
  updatedAt: string;
};
export type TrainingOutboxCommand = {
  ownerId: string;
  commandId: string;
  sessionId: string;
  expectedRevision: number;
  session: Session;
  createdAt: string;
  retryAfter: number;
  attempts: number;
  status: OfflineCommandStatus;
  lastError?: string;
};
export type TrainingSyncReceipt = {
  command_id: string;
  session_id: string;
  revision: number;
  outcome: "applied";
};
export interface OfflineTrainingTransaction {
  getSnapshot(ownerId: string, sessionId: string): Promise<LocalTrainingSnapshot | undefined>;
  putSnapshot(snapshot: LocalTrainingSnapshot): Promise<void>;
  getCommand(ownerId: string, commandId: string): Promise<TrainingOutboxCommand | undefined>;
  listCommands(ownerId: string): Promise<TrainingOutboxCommand[]>;
  putCommand(command: TrainingOutboxCommand): Promise<void>;
  deleteCommand(ownerId: string, commandId: string): Promise<void>;
}
export interface OfflineTrainingDatabase {
  /**
   * Must atomically commit ALL requested snapshot and outbox writes,
   * or none. Never wait for a network response inside the transaction.
   */
  transact<T>(fn: (tx: OfflineTrainingTransaction) => Promise<T>): Promise<T>;
}
export type OfflineSaveInput = {
  ownerId: string;
  commandId: string;
  session: Session;
  now: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const equalKey = (a: TrainingOutboxCommand, b: TrainingOutboxCommand) =>
  a.createdAt.localeCompare(b.createdAt) || a.commandId.localeCompare(b.commandId);

export function serverSessionProjection(session: Session): Session {
  // Device-local drafts are never sent. Cycle progress is server-authoritative.
  const payload = structuredClone(session);
  delete payload.setDrafts;
  delete payload.cycleCounted;
  return payload;
}
function checkInput(input: OfflineSaveInput) {
  if (!input.ownerId.trim() || !UUID.test(input.commandId)) {
    throw Error("Missing verified account or stable UUID command ID");
  }
  if (!Number.isFinite(Date.parse(input.now))) throw Error("Invalid local command time");
  validateTrainingSessions([input.session]);
}

export async function saveTrainingOffline(
  db: OfflineTrainingDatabase,
  input: OfflineSaveInput,
): Promise<TrainingOutboxCommand> {
  checkInput(input);
  return db.transact(async tx => {
    const { ownerId, commandId, session, now } = input;
    if (await tx.getCommand(ownerId, commandId))
      throw Error("A command ID cannot be reused for another local write");
    const commands = (await tx.listCommands(ownerId))
      .filter(command => command.sessionId === session.id)
      .sort(equalKey);
    if (commands.some(command => command.status !== "pending"))
      throw Error("Resolve the existing sync conflict before adding more cloud-bound writes");
    const previous = await tx.getSnapshot(ownerId, session.id);
    // Revision 0 = server has never received this Session. Pending writes
    // reserve subsequent revisions in queue order, even while offline.
    const serverRevision = previous?.serverRevision ?? 0;
    const expectedRevision = serverRevision + commands.length;
    const payload = structuredClone(session);
    const command: TrainingOutboxCommand = {
      ownerId, commandId, sessionId: session.id, expectedRevision,
      session: serverSessionProjection(payload),
      createdAt: now, retryAfter: 0, attempts: 0, status: "pending",
    };
    await tx.putSnapshot({
      ownerId, sessionId: session.id,
      serverRevision, localSequence: (previous?.localSequence ?? 0) + 1,
      payload, updatedAt: now,
    });
    await tx.putCommand(command);
    return command;
  });
}

/** Select only the oldest pending command per Session to preserve revision order. */
export async function readyTrainingCommands(
  db: OfflineTrainingDatabase, ownerId: string, nowMs: number,
): Promise<TrainingOutboxCommand[]> {
  if (!ownerId) return [];
  return db.transact(async tx => {
    const all = (await tx.listCommands(ownerId)).sort(equalKey);
    const seen = new Set<string>();
    const ready: TrainingOutboxCommand[] = [];
    for (const command of all) {
      if (seen.has(command.sessionId)) continue;
      seen.add(command.sessionId);
      if (command.status === "pending" && command.retryAfter <= nowMs)
        ready.push(command);
    }
    return ready;
  });
}
export async function acknowledgeTrainingCommand(
  db: OfflineTrainingDatabase, ownerId: string,
  commandId: string, receipt: TrainingSyncReceipt,
): Promise<boolean> {
  return db.transact(async tx => {
    const pending = await tx.getCommand(ownerId, commandId);
    if (!pending) return false; // Another tab already acknowledged this command.
    if (pending.status !== "pending" ||
        receipt.command_id !== commandId ||
        receipt.session_id !== pending.sessionId ||
        receipt.outcome !== "applied" ||
        receipt.revision !== pending.expectedRevision + 1)
      throw Error("Server receipt does not match the durable operation");
    const snapshot = await tx.getSnapshot(ownerId, pending.sessionId);
    if (!snapshot || snapshot.serverRevision !== pending.expectedRevision)
      throw Error("Local sync cursor changed; preserve operation for reconciliation");
    await tx.putSnapshot({
      ...snapshot, serverRevision: receipt.revision,
    }); // Never replace a newer local Session payload with old server data.
    await tx.deleteCommand(ownerId, commandId);
    return true;
  });
}
export async function markTrainingCommandFailed(
  db: OfflineTrainingDatabase, ownerId: string,
  commandId: string, nowMs: number, failure: "transient"|"conflict"|"rejected",
  reason: string,
): Promise<void> {
  return db.transact(async tx => {
    const command = await tx.getCommand(ownerId, commandId);
    if (!command) return;
    const attempts = command.attempts + 1;
    const delay = Math.min(60_000, 1_000 * 2 ** Math.min(6, attempts - 1));
    await tx.putCommand({
      ...command, attempts,
      status: failure === "transient" ? "pending" : failure,
      retryAfter: failure === "transient" ? nowMs + delay : Number.MAX_SAFE_INTEGER,
      lastError: reason.slice(0, 240),
    });
  });
}

export type TrainingSyncSender = (
  command: TrainingOutboxCommand,
) => Promise<TrainingSyncReceipt>;
/**
 * No automatic execution. The caller must supply verified identity and an
 * authenticated sender for the isolated DEV endpoint. Network requests occur
 * OUTSIDE IndexedDB transactions; results are committed atomically afterward.
 */
export async function flushReadyTrainingCommands(
  db: OfflineTrainingDatabase,
  ownerId: string,
  nowMs: number,
  isStillSignedIn: (ownerId: string) => boolean,
  send: TrainingSyncSender,
): Promise<{ applied: number; blocked: number; retrying: number }> {
  let applied = 0, blocked = 0, retrying = 0;
  const commands = await readyTrainingCommands(db, ownerId, nowMs);
  for (const command of commands) {
    if (!isStillSignedIn(ownerId)) break;
    try {
      const receipt = await send(command);
      // If logout/switch happens while in flight, do NOT touch the other
      // account's queue or accept the previous token's receipt.
      if (!isStillSignedIn(ownerId)) break;
      if (await acknowledgeTrainingCommand(db, ownerId, command.commandId, receipt))
        applied++;
    } catch (error) {
      if (!isStillSignedIn(ownerId)) break;
      const code = (error as {code?: string})?.code;
      const kind = code === "40001" ? "conflict" :
        code === "22023" || code === "42501" ? "rejected" : "transient";
      await markTrainingCommandFailed(
        db, ownerId, command.commandId, nowMs, kind,
        error instanceof Error ? error.message : "Unspecified network failure",
      );
      if (kind === "transient") retrying++; else blocked++;
    }
  }
  return { applied, blocked, retrying };
}
