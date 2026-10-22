import type {
  TrainingOutboxCommand, TrainingSyncReceipt, TrainingSyncSender,
} from "./protocol";
import type { VerifiedRemoteSession } from "./verified-remote-import";
import { validateTrainingSessions } from "../training-core/validation";

type SupabaseUser = { id: string } | null;
type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
export interface DevSupabaseTransport {
  auth: { getUser(): Promise<{
    data: { user: SupabaseUser };
    error: { code?: string; message: string } | null;
  }> };
  rpc(method: string, params: Record<string, unknown>): Promise<RpcResult>;
}
export type DevTransportConfig = {
  /** Public *isolated* development project URL; never existing production OAuth URL. */
  devUrl: string;
  productionUrl: string;
  expectedDevProjectRef: string;
};

export function assertIsolatedDevProject(config: DevTransportConfig): void {
  const dev = new URL(config.devUrl);
  const prod = new URL(config.productionUrl);
  const ref = config.expectedDevProjectRef;
  if (!/^[a-z0-9]{12,32}$/.test(ref) ||
      dev.protocol !== "https:" ||
      dev.hostname !== ref + ".supabase.co" ||
      dev.pathname !== "/" ||
      dev.origin === prod.origin) {
    throw Error("An explicitly confirmed, separate HTTPS Supabase dev project is required");
  }
}

export function createVerifiedDevTrainingSender(
  transport: DevSupabaseTransport,
  config: DevTransportConfig,
): TrainingSyncSender {
  assertIsolatedDevProject(config);
  return async (command: TrainingOutboxCommand): Promise<TrainingSyncReceipt> => {
    const { data, error: authError } = await transport.auth.getUser();
    if (authError || !data.user || data.user.id !== command.ownerId) {
      const error = Error("Dev account must be server-verified before syncing");
      Object.assign(error, { code: "42501" });
      throw error;
    }
    const response = await transport.rpc("jfs_dev_apply_session_v1", {
      p_command_id: command.commandId,
      p_session_id: command.sessionId,
      p_expected_revision: command.expectedRevision,
      p_session: command.session,
    });
    if (response.error) {
      const error = Error(response.error.message);
      Object.assign(error, { code: response.error.code });
      throw error;
    }
    const receipt = response.data as Partial<TrainingSyncReceipt> | null;
    if (!receipt ||
        receipt.command_id !== command.commandId ||
        receipt.session_id !== command.sessionId ||
        receipt.revision !== command.expectedRevision + 1 ||
        receipt.outcome !== "applied") {
      throw Error("Dev Supabase responded with an invalid Training receipt");
    }
    return receipt as TrainingSyncReceipt;
  };
}

/**
 * First-device pairing fetch, verified with the live development Auth service.
 * Never use a cached access-token payload as proof of account ownership.
 */
export async function readVerifiedDevTrainingSession(
  transport: DevSupabaseTransport,
  config: DevTransportConfig,
  ownerId: string,
  sessionId: string,
): Promise<VerifiedRemoteSession | null> {
  assertIsolatedDevProject(config);
  if (!ownerId || !sessionId || sessionId.length > 128)
    throw Error("Missing verified account or valid Session ID");
  const { data, error: authError } = await transport.auth.getUser();
  if (authError || !data.user || data.user.id !== ownerId) {
    const error = Error("Dev identity verification failed before remote read");
    Object.assign(error, { code: "42501" });
    throw error;
  }
  const result = await transport.rpc("jfs_dev_read_session_v1", {
    p_session_id: sessionId,
  });
  if (result.error) {
    const error = Error(result.error.message);
    Object.assign(error, { code: result.error.code });
    throw error;
  }
  if (result.data === null) return null;
  const remote = result.data as VerifiedRemoteSession;
  if (!remote || remote.session_id !== sessionId ||
      remote.session?.id !== sessionId ||
      remote.session?.setDrafts !== undefined ||
      remote.session?.cycleCounted !== undefined ||
      !Number.isSafeInteger(remote.revision) || remote.revision < 1 ||
      !Number.isFinite(Date.parse(remote.written_at))) {
    throw Error("Untrusted dev Session read response");
  }
  validateTrainingSessions([remote.session]);
  return remote;
}
