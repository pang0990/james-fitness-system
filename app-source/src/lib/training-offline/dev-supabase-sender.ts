import type {
  TrainingOutboxCommand, TrainingSyncReceipt, TrainingSyncSender,
} from "./protocol";

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
