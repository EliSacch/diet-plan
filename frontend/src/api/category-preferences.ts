import type { CategoryPreference } from "../types/category-preference";
import { api } from "./client";

export async function setCategoryPreference(preference: CategoryPreference) {
  const { data } = await api.put<CategoryPreference>("/api/category-preferences", preference);
  return data;
}
