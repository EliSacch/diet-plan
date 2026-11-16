import type { PlanDocument } from "../types/diet-plan";
import { api } from "./client";

type UploadOptions = {
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
};

export async function getActiveDietPlan(signal: AbortSignal) {
  const { data } = await api.get<PlanDocument>("/api/diet-plans/active", { signal });
  return data;
}

export async function uploadDietPlan(file: File, { signal, onProgress }: UploadOptions = {}) {
  const body = new FormData();
  body.append("file", file);
  const { data } = await api.post<PlanDocument>("/api/diet-plans/upload", body, {
    signal,
    onUploadProgress: (event) => {
      if (event.total) {
        onProgress?.(event.loaded / event.total);
      }
    },
  });
  return data;
}
