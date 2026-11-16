import type { PlanDocument } from "../types/diet-plan";
import type { Week, WeekChoice } from "../types/week";
import { api } from "./client";

export async function getWeek(weekStart: string, signal: AbortSignal) {
  const { data } = await api.get<Week>(`/api/weeks/${weekStart}`, { signal });
  return data;
}

export async function getWeekOptions(weekStart: string, signal: AbortSignal) {
  const { data } = await api.get<PlanDocument>(`/api/weeks/${weekStart}/options`, { signal });
  return data;
}

export async function saveWeek(weekStart: string, choices: WeekChoice[]) {
  const { data } = await api.put<Week>(`/api/weeks/${weekStart}`, { choices });
  return data;
}
