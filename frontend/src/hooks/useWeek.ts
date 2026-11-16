import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { getWeek, getWeekOptions, saveWeek } from "../api/weeks";
import type { WeekChoice } from "../types/week";

export function weekQueryOptions(weekStart: string) {
  return queryOptions({
    queryKey: ["weeks", weekStart] as const,
    retry: false,
    queryFn: ({ signal }) => getWeek(weekStart, signal),
  });
}

export function weekOptionsQueryOptions(weekStart: string) {
  return queryOptions({
    queryKey: ["weeks", weekStart, "options"] as const,
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        return await getWeekOptions(weekStart, signal);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });
}

export function useWeek(weekStart: string) {
  return useQuery(weekQueryOptions(weekStart));
}

export function useWeekOptions(weekStart: string) {
  return useQuery(weekOptionsQueryOptions(weekStart));
}

export function useSaveWeek(weekStart: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (choices: WeekChoice[]) => saveWeek(weekStart, choices),
    onSuccess: (week) => {
      queryClient.setQueryData(weekQueryOptions(weekStart).queryKey, week);
    },
  });
}
