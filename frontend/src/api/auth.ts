import { api } from "./client";

export async function logout() {
  await api.post("/auth/logout");
}
