"use client";
import { type AppState } from "./domain";

const SESSION_KEY = "james-fitness-cloud-session-v1";
const baseUrl = () => (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export type CloudSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email?: string };
};

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id: string; email?: string };
  error_description?: string;
  msg?: string;
};

export function cloudConfigured() {
  return Boolean(baseUrl() && anonKey());
}

function headers(token?: string) {
  return {
    apikey: anonKey(),
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function authRequest(path: string, body: unknown) {
  if (!cloudConfigured()) throw Error("Supabase 尚未設定");
  const res = await fetch(baseUrl() + path, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as AuthResponse;
  if (!res.ok) throw Error(data.error_description || data.msg || "雲端登入失敗");
  return data;
}

function persist(session: CloudSession | null) {
  if (typeof window === "undefined") return;
  if (!session) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function normalizeAuth(data: AuthResponse): CloudSession | null {
  if (!data.access_token || !data.refresh_token || !data.user) return null;
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    user: data.user,
  };
  persist(session);
  return session;
}

export async function signInPassword(email: string, password: string) {
  return normalizeAuth(
    await authRequest("/auth/v1/token?grant_type=password", { email, password }),
  );
}

export async function signUpPassword(email: string, password: string) {
  return normalizeAuth(await authRequest("/auth/v1/signup", { email, password }));
}

export async function restoreCloudSession(): Promise<CloudSession | null> {
  if (!cloudConfigured() || typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const current = JSON.parse(raw) as CloudSession;
    if (current.expires_at > Math.floor(Date.now() / 1000) + 60) return current;
    const refreshed = await authRequest("/auth/v1/token?grant_type=refresh_token", {
      refresh_token: current.refresh_token,
    });
    return normalizeAuth(refreshed);
  } catch {
    persist(null);
    return null;
  }
}

export async function signOutCloud() {
  const session = await restoreCloudSession();
  if (session) {
    await fetch(baseUrl() + "/auth/v1/logout", {
      method: "POST",
      headers: headers(session.access_token),
    }).catch(() => undefined);
  }
  persist(null);
}

export async function pullCloudState() {
  const session = await restoreCloudSession();
  if (!session) throw Error("尚未登入雲端");
  const res = await fetch(
    baseUrl() +
      `/rest/v1/user_states?user_id=eq.${encodeURIComponent(session.user.id)}&select=state,revision,updated_at&limit=1`,
    { headers: { ...headers(session.access_token), Accept: "application/json" } },
  );
  if (!res.ok) throw Error("讀取雲端資料失敗");
  const rows = (await res.json()) as {
    state: AppState;
    revision: number;
    updated_at: string;
  }[];
  return rows[0] ?? null;
}

export async function pushCloudState(state: AppState) {
  const session = await restoreCloudSession();
  if (!session) throw Error("尚未登入雲端");
  const res = await fetch(baseUrl() + "/rest/v1/user_states?on_conflict=user_id", {
    method: "POST",
    headers: {
      ...headers(session.access_token),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      user_id: session.user.id,
      state,
      revision: state.revision,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw Error("同步雲端資料失敗");
  return session;
}
