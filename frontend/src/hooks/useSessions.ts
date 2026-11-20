import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { profileQueryKey, sessionsQueryKey } from "../api/queryKeys";
import {
  listSessions,
  revokeAllSessions,
  revokeOtherSessions,
  revokeSession,
} from "../api/sessions";
import { messageForProblem, t } from "../i18n";
import type { Problem } from "../types/problem";
import type { Profile } from "../types/profile";
import { useToast } from "./useToast";

export { sessionsQueryKey };

function isProblem(data: unknown): data is Problem {
  return typeof data === "object" && data !== null;
}

export function sessionsErrorMessage(error: unknown) {
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
  return t("UNKNOWN_ERROR");
}

export function useSessions() {
  return useQuery({
    queryKey: sessionsQueryKey,
    retry: false,
    queryFn: ({ signal }) => listSessions(signal),
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  const showToast = useToast();
  return useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
      showToast({ message: t("SESSION_SIGNED_OUT") });
    },
    onError: (error) => {
      showToast({ message: sessionsErrorMessage(error), variant: "error" });
    },
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  const showToast = useToast();
  return useMutation({
    mutationFn: revokeOtherSessions,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
      showToast({ message: t("OTHER_SESSIONS_SIGNED_OUT") });
    },
    onError: (error) => {
      showToast({ message: sessionsErrorMessage(error), variant: "error" });
    },
  });
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient();
  const showToast = useToast();
  return useMutation({
    mutationFn: revokeAllSessions,
    onSuccess: () => {
      queryClient.setQueryData<Profile | null>(profileQueryKey, null);
      queryClient.removeQueries({ queryKey: sessionsQueryKey });
      showToast({ message: t("SIGNED_OUT") });
    },
    onError: (error) => {
      showToast({ message: sessionsErrorMessage(error), variant: "error" });
    },
  });
}
