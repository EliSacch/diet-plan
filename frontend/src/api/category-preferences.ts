import type { CategoryPreference } from "../types/category-preference";
import { api } from "./client";

export async function listCategoryPreferences(signal: AbortSignal) {
  const { data } = await api.get<CategoryPreference[]>("/api/category-preferences", { signal });
  return data;
}

export async function setCategoryPreference(preference: CategoryPreference) {
  const { data } = await api.put<CategoryPreference>("/api/category-preferences", preference);
  return data;
}
