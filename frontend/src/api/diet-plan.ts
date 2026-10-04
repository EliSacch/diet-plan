import type { PlanDocument } from "../types/diet-plan";
import { api } from "./client";

export async function getActiveDietPlan(signal: AbortSignal) {
  const { data } = await api.get<PlanDocument>("/api/diet-plans/active", { signal });
  return data;
}

export async function uploadDietPlan(file: File) {
  const body = new FormData();
  body.append("file", file);
  const { data } = await api.post<PlanDocument>("/api/diet-plans/upload", body);
  return data;
}
