import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { ToastProvider } from "../context/ToastContext";
import { setLocale } from "../i18n";
import { axiosFailure, axiosResponse } from "../test/http";
import type { SessionList } from "../types/session";
import SessionsSection from "./SessionsSection";

const sessions: SessionList = {
  sessions: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      is_current: true,
      device: "Chrome on macOS",
      location: "Local network",
      created_at: "2026-03-01T10:00:00.000Z",
      last_seen_at: "2026-03-15T09:05:00.000Z",
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      is_current: false,
      device: "Safari on iPhone",
      location: "Milan, Lombardy, Italy",
      created_at: "2026-03-10T08:00:00.000Z",
      last_seen_at: "2026-03-14T18:00:00.000Z",
    },
  ],
};

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<SessionsSection />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    ),
  });
}

describe("SessionsSection", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("revokes another device after confirm", async () => {
    setLocale("en");
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse(sessions));
    const remove = vi.spyOn(api, "delete").mockResolvedValue(axiosResponse(""));

    renderSection();

    expect(await screen.findByText("Safari on iPhone")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sign out device: Safari on iPhone" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Sign out this device?" })).getByRole("button", {
        name: "Sign out device",
      }),
    );

    await waitFor(() => {
      expect(remove).toHaveBeenCalledWith("/api/sessions/22222222-2222-2222-2222-222222222222");
    });
    expect(await screen.findByText("That device has been signed out.")).toBeTruthy();
  });

  it("revokes all sessions after confirm", async () => {
    setLocale("en");
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse(sessions));
    const post = vi.spyOn(api, "post").mockResolvedValue(axiosResponse(""));

    renderSection();

    expect(await screen.findByText("Chrome on macOS")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Sign out everywhere?" })).getByRole("button", {
        name: "Sign out everywhere",
      }),
    );

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("/api/sessions/revoke-all");
    });
    expect(await screen.findByText("You've been signed out.")).toBeTruthy();
  });

  it("revokes other sessions after confirm", async () => {
    setLocale("en");
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse(sessions));
    const post = vi.spyOn(api, "post").mockResolvedValue(axiosResponse(""));

    renderSection();

    expect(await screen.findByText("Safari on iPhone")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sign out other devices" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Sign out other devices?" })).getByRole("button", {
        name: "Sign out other devices",
      }),
    );

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("/api/sessions/revoke-others");
    });
    expect(await screen.findByText("Other devices have been signed out.")).toBeTruthy();
  });

  it("translates unknown device and hides a missing location", async () => {
    setLocale("en");
    vi.spyOn(api, "get").mockResolvedValue(
      axiosResponse({
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
      }),
    );

    renderSection();

    expect(await screen.findByText("Unknown device")).toBeTruthy();
    expect(screen.queryByText("Local network")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign out other devices" })).toBeNull();
  });

  it("shows an error when sessions fail to load", async () => {
    setLocale("en");
    vi.spyOn(api, "get").mockRejectedValue(axiosFailure(500, { code: "INTERNAL_ERROR" }));

    renderSection();

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Something went wrong. Try again.",
    );
  });

  it("cancels a revoke confirm without calling the API", async () => {
    setLocale("en");
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse(sessions));
    const post = vi.spyOn(api, "post");

    renderSection();

    expect(await screen.findByText("Chrome on macOS")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    const dialog = screen.getByRole("dialog", { name: "Sign out everywhere?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: "Sign out everywhere?" })).toBeNull();
    expect(post).not.toHaveBeenCalled();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Sign out everywhere", hidden: true }),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("shows an error toast when revoke everywhere fails", async () => {
    setLocale("en");
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse(sessions));
    vi.spyOn(api, "post").mockRejectedValue(axiosFailure(500, { code: "INTERNAL_ERROR" }));

    renderSection();

    expect(await screen.findByText("Chrome on macOS")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Sign out everywhere?" })).getByRole("button", {
        name: "Sign out everywhere",
      }),
    );

    expect(await screen.findByText("Something went wrong. Try again.")).toBeTruthy();
  });

  it("shows an error toast when revoking one device fails", async () => {
    setLocale("en");
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse(sessions));
    vi.spyOn(api, "delete").mockRejectedValue(axiosFailure(500, { code: "INTERNAL_ERROR" }));

    renderSection();

    expect(await screen.findByText("Safari on iPhone")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sign out device: Safari on iPhone" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Sign out this device?" })).getByRole("button", {
        name: "Sign out device",
      }),
    );

    expect(await screen.findByText("Something went wrong. Try again.")).toBeTruthy();
  });

  it("shows an error toast when revoking other devices fails", async () => {
    setLocale("en");
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse(sessions));
    vi.spyOn(api, "post").mockRejectedValue(axiosFailure(500, { code: "INTERNAL_ERROR" }));

    renderSection();

    expect(await screen.findByText("Safari on iPhone")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sign out other devices" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Sign out other devices?" })).getByRole("button", {
        name: "Sign out other devices",
      }),
    );

    expect(await screen.findByText("Something went wrong. Try again.")).toBeTruthy();
  });
});
