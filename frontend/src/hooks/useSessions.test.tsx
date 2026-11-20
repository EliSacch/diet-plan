import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { ToastProvider } from "../context/ToastContext";
import { setLocale } from "../i18n";
import { axiosFailure, axiosResponse } from "../test/http";
import type { SessionList } from "../types/session";
import { sessionsErrorMessage, useSessions } from "./useSessions";

import { en } from "../i18n/locales/en";

const sessions: SessionList = {
  sessions: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      is_current: true,
      device: "Unknown device",
      location: null,
      created_at: "2026-03-01T10:00:00.000Z",
      last_seen_at: "2026-03-15T09:05:00.000Z",
    },
  ],
};

function renderSessions() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useSessions(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    ),
  });
}

describe("sessionsErrorMessage", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("returns the catalog message for a problem code", () => {
    expect(sessionsErrorMessage(axiosFailure(500, { code: "INTERNAL_ERROR" }))).toBe(
      en.errors.INTERNAL_ERROR,
    );
  });

  it("returns the unknown message when the body is not a problem", () => {
    expect(sessionsErrorMessage(axiosFailure(500, ""))).toBe(en.errors.UNKNOWN);
    expect(sessionsErrorMessage(new AxiosError("network"))).toBe(en.errors.UNKNOWN);
  });

  it("returns an error message or the unknown fallback", () => {
    expect(sessionsErrorMessage(new Error("The request was blocked."))).toBe(
      "The request was blocked.",
    );
    expect(sessionsErrorMessage("nope")).toBe("Unknown error");
  });
});

describe("useSessions", () => {
  it("loads sessions", async () => {
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse(sessions));

    const { result } = renderSessions();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sessions);
  });
});
