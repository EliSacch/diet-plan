import type { Day, DayChoice, DayOptions } from "../types/day";
import { api } from "./client";

export async function getDay(date: string, signal: AbortSignal) {
  const { data } = await api.get<Day>(`/api/days/${date}`, { signal });
  return data;
}

export async function getDayOptions(date: string, signal: AbortSignal) {
  const { data } = await api.get<DayOptions>(`/api/days/${date}/options`, { signal });
  return data;
}

export async function saveDay(date: string, choices: DayChoice[]) {
  const { data } = await api.put<Day>(`/api/days/${date}`, { choices });
  return data;
}
