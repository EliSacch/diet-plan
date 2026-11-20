import type { SessionList } from "../types/session";
import { api } from "./client";

export async function listSessions(signal?: AbortSignal) {
  const { data } = await api.get<SessionList>("/api/sessions", { signal });
  return data;
}

export async function revokeSession(sessionId: string) {
  await api.delete(`/api/sessions/${sessionId}`);
}

export async function revokeOtherSessions() {
  await api.post("/api/sessions/revoke-others");
}

export async function revokeAllSessions() {
  await api.post("/api/sessions/revoke-all");
}
