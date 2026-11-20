import type { CustomOption, CustomOptionInput } from "../types/custom-option";
import { api } from "./client";

export async function createCustomOption(option: CustomOptionInput) {
  const { data } = await api.post<CustomOption>("/api/custom-options", option);
  return data;
}

export async function deleteCustomOption(id: number) {
  await api.delete(`/api/custom-options/${id}`);
}
