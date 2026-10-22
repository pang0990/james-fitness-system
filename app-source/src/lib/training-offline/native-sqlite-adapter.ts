import type {
  OfflineTrainingDatabase, OfflineTrainingTransaction,
  LocalTrainingSnapshot, TrainingOutboxCommand,
} from "./protocol";

type BindValue = string | number | null;
type SqliteQuery = {
  getFirstAsync<T>(sql: string, params: BindValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params: BindValue[]): Promise<T[]>;
  runAsync(sql: string, params: BindValue[]): Promise<unknown>;
};
export type NativeSqliteDatabase = {
  execAsync(sql: string): Promise<void>;
  withExclusiveTransactionAsync(run: (tx: SqliteQuery) => Promise<void>): Promise<void>;
};

const DB_NAME = "jfs-native-offline-dev-v1.db";
const CREATE_SCHEMA = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS offline_sessions (
  owner_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  data_json TEXT NOT NULL,
  PRIMARY KEY (owner_id, session_id)
);
CREATE TABLE IF NOT EXISTS offline_commands (
  owner_id TEXT NOT NULL,
  command_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  data_json TEXT NOT NULL,
  PRIMARY KEY (owner_id, command_id)
);
CREATE INDEX IF NOT EXISTS offline_commands_owner ON offline_commands(owner_id, session_id, sequence);
`;

const unpack = <T>(row: { data_json: string } | null): T | undefined =>
  row ? JSON.parse(row.data_json) as T : undefined;

/**
 * Native iOS/Android SQLite implementation of the same Training Outbox API.
 * Only inject expo-sqlite openDatabaseAsync from the native app. No Expo
 * dependency is imported into Next.js or shared Training Core.
 *
 * withExclusiveTransactionAsync is intentionally mandatory: Expo docs warn
 * that non-exclusive withTransactionAsync may include concurrent statements.
 */
export function createNativeSqliteTrainingDatabase(
  openDatabaseAsync: (name: string) => Promise<NativeSqliteDatabase>,
): OfflineTrainingDatabase {
  let connected: Promise<NativeSqliteDatabase> | undefined;
  const connection = () => {
    if (!connected) {
      connected = openDatabaseAsync(DB_NAME).then(async db => {
        await db.execAsync(CREATE_SCHEMA);
        return db;
      }).catch(error => {
        connected = undefined;
        throw error;
      });
    }
    return connected;
  };

  return {
    async transact<T>(fn: (tx: OfflineTrainingTransaction) => Promise<T>): Promise<T> {
      const db = await connection();
      let result!: T;
      await db.withExclusiveTransactionAsync(async sql => {
        const tx: OfflineTrainingTransaction = {
          async getSnapshot(ownerId, sessionId) {
            return unpack<LocalTrainingSnapshot>(await sql.getFirstAsync<{data_json:string}>(
              "SELECT data_json FROM offline_sessions WHERE owner_id=? AND session_id=?",
              [ownerId, sessionId],
            ));
          },
          async putSnapshot(value) {
            await sql.runAsync(
              "INSERT INTO offline_sessions(owner_id,session_id,data_json) VALUES(?,?,?) " +
              "ON CONFLICT(owner_id,session_id) DO UPDATE SET data_json=excluded.data_json",
              [value.ownerId, value.sessionId, JSON.stringify(value)],
            );
          },
          async getCommand(ownerId, commandId) {
            return unpack<TrainingOutboxCommand>(await sql.getFirstAsync<{data_json:string}>(
              "SELECT data_json FROM offline_commands WHERE owner_id=? AND command_id=?",
              [ownerId, commandId],
            ));
          },
          async listCommands(ownerId) {
            const rows = await sql.getAllAsync<{data_json:string}>(
              "SELECT data_json FROM offline_commands WHERE owner_id=? ORDER BY session_id, sequence",
              [ownerId],
            );
            return rows.map(row => JSON.parse(row.data_json) as TrainingOutboxCommand);
          },
          async putCommand(command) {
            await sql.runAsync(
              "INSERT INTO offline_commands(owner_id,command_id,session_id,sequence,data_json) " +
              "VALUES(?,?,?,?,?) ON CONFLICT(owner_id,command_id) DO UPDATE SET " +
              "session_id=excluded.session_id,sequence=excluded.sequence,data_json=excluded.data_json",
              [command.ownerId, command.commandId, command.sessionId,
                command.sequence, JSON.stringify(command)],
            );
          },
          async deleteCommand(ownerId, commandId) {
            await sql.runAsync(
              "DELETE FROM offline_commands WHERE owner_id=? AND command_id=?",
              [ownerId, commandId],
            );
          },
        };
        result = await fn(tx);
      });
      return result;
    },
  };
}
