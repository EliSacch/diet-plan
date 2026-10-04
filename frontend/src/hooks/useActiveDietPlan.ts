import { queryOptions, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { getActiveDietPlan } from "../api/diet-plan";
import { messageForProblem } from "../i18n";
import type { Problem } from "../types/problem";

const activeDietPlanQueryKey = ["diet-plan", "active"] as const;

function isProblem(data: unknown): data is Problem {
  return typeof data === "object" && data !== null;
}

export function dietPlanErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (isProblem(data)) {
      return messageForProblem(data);
    }
    return messageForProblem({});
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

export function activeDietPlanQueryOptions() {
  return queryOptions({
    queryKey: activeDietPlanQueryKey,
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        return await getActiveDietPlan(signal);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });
}

export function useActiveDietPlan() {
  return useQuery(activeDietPlanQueryOptions());
}
