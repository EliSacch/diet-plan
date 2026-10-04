import { createContext, type ReactNode } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { logout } from "../api/auth";
import { getProfile } from "../api/profile";
import { messageForProblem } from "../i18n";
import type { Problem } from "../types/problem";
import type { Profile } from "../types/profile";

const profileQueryKey = ["profile"] as const;

export type Session =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; email: string; signOut: () => void }
  | { status: "error"; message: string };

// oxlint-disable-next-line react/only-export-components -- provider and context stay in this file
export const SessionContext = createContext<Session | null>(null);

function isProblem(data: unknown): data is Problem {
  return typeof data === "object" && data !== null;
}

function sessionErrorMessage(error: unknown) {
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

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: profileQueryKey,
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        return await getProfile(signal);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
          return null;
        }
        throw error;
      }
    },
  });
  const signOutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData<Profile | null>(profileQueryKey, null);
    },
  });

  let session: Session;
  if (signOutMutation.isError) {
    session = { status: "error", message: sessionErrorMessage(signOutMutation.error) };
  } else if (profileQuery.isPending) {
    session = { status: "loading" };
  } else if (profileQuery.isError) {
    session = { status: "error", message: sessionErrorMessage(profileQuery.error) };
  } else if (profileQuery.data === null) {
    session = { status: "signedOut" };
  } else {
    session = {
      status: "signedIn",
      email: profileQuery.data.email,
      signOut: () => {
        signOutMutation.mutate();
      },
    };
  }

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}
