import type { Profile } from "../types/profile";
import { api } from "./client";

export async function getProfile(signal: AbortSignal) {
  const { data } = await api.get<Profile>("/api/profile", { signal });
  return data;
}
