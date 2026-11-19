import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { getDay, getDayOptions, saveDay } from "../api/days";
import type { DayChoice } from "../types/day";

export function dayQueryOptions(date: string) {
  return queryOptions({
    queryKey: ["days", date] as const,
    retry: false,
    queryFn: ({ signal }) => getDay(date, signal),
  });
}

export function dayOptionsQueryOptions(date: string) {
  return queryOptions({
    queryKey: ["days", date, "options"] as const,
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        return await getDayOptions(date, signal);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });
}

export function useDay(date: string) {
  return useQuery(dayQueryOptions(date));
}

export function useDayOptions(date: string) {
  return useQuery(dayOptionsQueryOptions(date));
}

export function useSaveDay(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (choices: DayChoice[]) => saveDay(date, choices),
    onSuccess: (day) => {
      queryClient.setQueryData(dayQueryOptions(date).queryKey, day);
    },
  });
}
