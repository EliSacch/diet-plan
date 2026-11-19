import type { Day, DayChoice } from "../types/day";
import type { PlanDay } from "../types/diet-plan";
import { api } from "./client";

export async function getDay(date: string, signal: AbortSignal) {
  const { data } = await api.get<Day>(`/api/days/${date}`, { signal });
  return data;
}

export async function getDayOptions(date: string, signal: AbortSignal) {
  const { data } = await api.get<PlanDay>(`/api/days/${date}/options`, { signal });
  return data;
}

export async function saveDay(date: string, choices: DayChoice[]) {
  const { data } = await api.put<Day>(`/api/days/${date}`, { choices });
  return data;
}
