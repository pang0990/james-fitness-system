import type {
  OfflineTrainingDatabase, OfflineTrainingTransaction,
  LocalTrainingSnapshot, TrainingOutboxCommand,
} from "./protocol";

const snapshotKey = (ownerId: string, sessionId: string) =>
  JSON.stringify([ownerId, sessionId]);
const commandKey = (ownerId: string, commandId: string) =>
  JSON.stringify([ownerId, commandId]);

/**
 * Reference implementation for deterministic tests. This behaves like a
 * single atomic IndexedDB transaction, not like a network-backed database.
 * Production Web uses WebIndexedDbTrainingDatabase instead.
 */
export class MemoryTrainingDatabase implements OfflineTrainingDatabase {
  private snapshots = new Map<string, LocalTrainingSnapshot>();
  private commands = new Map<string, TrainingOutboxCommand>();
  private exclusive: Promise<void> = Promise.resolve();

  async transact<T>(fn: (tx: OfflineTrainingTransaction) => Promise<T>): Promise<T> {
    let release!: () => void;
    const prior = this.exclusive;
    this.exclusive = new Promise<void>(resolve => { release = resolve; });
    await prior;
    const snapshots = new Map([...this.snapshots].map(([key, value]) =>
      [key, structuredClone(value)] as const));
    const commands = new Map([...this.commands].map(([key, value]) =>
      [key, structuredClone(value)] as const));
    const tx: OfflineTrainingTransaction = {
      async getSnapshot(ownerId, sessionId) {
        const found = snapshots.get(snapshotKey(ownerId, sessionId));
        return found && structuredClone(found);
      },
      async putSnapshot(snapshot) {
        snapshots.set(snapshotKey(snapshot.ownerId, snapshot.sessionId), structuredClone(snapshot));
      },
      async getCommand(ownerId, commandId) {
        const found = commands.get(commandKey(ownerId, commandId));
        return found && structuredClone(found);
      },
      async listCommands(ownerId) {
        return [...commands.values()].filter(command => command.ownerId === ownerId)
          .map(command => structuredClone(command));
      },
      async putCommand(command) {
        commands.set(commandKey(command.ownerId, command.commandId), structuredClone(command));
      },
      async deleteCommand(ownerId, commandId) {
        commands.delete(commandKey(ownerId, commandId));
      },
    };
    try {
      const result = await fn(tx);
      this.snapshots = snapshots;
      this.commands = commands;
      return result;
    } finally {
      release();
    }
  }
}
