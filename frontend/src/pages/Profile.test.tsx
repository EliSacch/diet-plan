import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { SessionProvider } from "../context/SessionContext";
import { ToastProvider } from "../context/ToastContext";
import { getLocale, setLocale } from "../i18n";
import { axiosFailure, axiosResponse, deferred } from "../test/http";
import type { ActiveDietPlan } from "../types/diet-plan";
import type { SessionList } from "../types/session";
import Profile from "./Profile";

import App from "../App";

import { en } from "../i18n/locales/en";

import type { AxiosResponse } from "axios";

const uploadedAt = "2026-03-15T09:05:00.000Z";

const currentSessionId = "11111111-1111-1111-1111-111111111111";
const otherSessionId = "22222222-2222-2222-2222-222222222222";

const defaultSessions: SessionList = {
  sessions: [
    {
      id: currentSessionId,
      is_current: true,
      device: "Chrome on macOS",
      location: "Local network",
      created_at: "2026-03-01T10:00:00.000Z",
      last_seen_at: uploadedAt,
    },
  ],
};

const plan: ActiveDietPlan = {
  source_filename: null,
  uploaded_at: uploadedAt,
  days: [
    {
      day: "Lunedì",
      meals: [
        {
          meal: "Colazione",
          categories: [
            {
              category: "Bevande",
              options: [{ name: "Tè", amount: 200, unit: "ml", position: 0 }],
            },
          ],
        },
      ],
    },
  ],
};

function mockApi(activePlan?: ActiveDietPlan | null, sessions: SessionList = defaultSessions) {
  vi.spyOn(api, "get").mockImplementation((url: string) => {
    if (url === "/api/profile") {
      return Promise.resolve(axiosResponse({ id: 1, email: "ada@example.com" }));
    }
    if (url === "/api/diet-plans/active") {
      if (activePlan === undefined) {
        return Promise.reject(axiosFailure(404, { code: "NOT_FOUND" }));
      }
      return Promise.resolve(axiosResponse(activePlan));
    }
    if (url === "/api/sessions") {
      return Promise.resolve(axiosResponse(sessions));
    }
    return Promise.reject(new Error(`Unexpected ${url}`));
  });
}

function formattedLastSeen(value: string) {
  return new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formattedUploadDate(value: string) {
  return new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

describe("Profile", () => {
  beforeEach(() => {
    setLocale("en");
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("shows the signed-in email and returns to the Google button after sign out", async () => {
    window.history.pushState({}, "", "/profile");
    mockApi();
    const logout = vi.spyOn(api, "post").mockResolvedValue(axiosResponse(undefined));

    render(<App />);

    const account = await screen.findByRole("region", { name: "Account" });
    expect(within(account).getByText("ada@example.com")).toBeTruthy();
    expect(within(account).getByText("A")).toBeTruthy();
    expect(screen.getByRole("heading", { name: en.labels.PROFILE, level: 1 })).toBeTruthy();
    expect(document.title).toBe(`${en.labels.PROFILE} · Diet Plan`);
    expect(screen.queryByRole("region", { name: "Uploaded file" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    const dialog = screen.getByRole("dialog", { name: "Sign out?" });
    expect(logout).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("link", { name: "Sign in with Google" })).toBeTruthy();
    expect(logout.mock.calls[0]?.[0]).toBe("/auth/logout");
    expect(
      within(screen.getByRole("region", { name: "Notifications" })).getByText(
        "You've been signed out.",
      ),
    ).toBeTruthy();
  });

  it("stays signed in when sign out is cancelled", async () => {
    window.history.pushState({}, "", "/profile");
    mockApi();
    const logout = vi.spyOn(api, "post");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(logout).not.toHaveBeenCalled();
  });

  it("shows the profile page when signed in", async () => {
    window.history.pushState({}, "", "/profile");
    mockApi();

    render(<App />);

    expect(screen.getByRole("status", { name: "Checking your session…" })).toBeTruthy();
    const account = await screen.findByRole("region", { name: "Account" });
    expect(within(account).getByText("ada@example.com")).toBeTruthy();
    expect(within(account).getByRole("button", { name: "Sign out" }).className).toContain(
      "btn-secondary",
    );
    expect(screen.getByLabelText("Upload diet plan")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Uploaded file" })).toBeNull();
  });

  it("lists signed-in devices with richer labels and revoke actions", async () => {
    window.history.pushState({}, "", "/profile");
    mockApi(undefined, {
      sessions: [
        ...defaultSessions.sessions,
        {
          id: otherSessionId,
          is_current: false,
          device: "Safari on iPhone",
          location: "Milan, Lombardy, Italy",
          created_at: "2026-03-10T08:00:00.000Z",
          last_seen_at: "2026-03-14T18:00:00.000Z",
        },
      ],
    });
    const post = vi.spyOn(api, "post").mockResolvedValue(axiosResponse(""));
    const remove = vi.spyOn(api, "delete").mockResolvedValue(axiosResponse(""));

    render(<App />);

    expect(await screen.findByText("Chrome on macOS")).toBeTruthy();
    const devices = screen.getByRole("region", { name: "Signed-in devices" });
    expect(within(devices).getByText("Local network")).toBeTruthy();
    expect(within(devices).getByText("This device")).toBeTruthy();
    expect(within(devices).getByText(formattedLastSeen(uploadedAt)).tagName).toBe("TIME");
    expect(within(devices).getByText("Safari on iPhone")).toBeTruthy();
    expect(within(devices).getByText("Milan, Lombardy, Italy")).toBeTruthy();
    expect(within(devices).getByRole("button", { name: "Sign out other devices" })).toBeTruthy();
    expect(within(devices).getByRole("button", { name: "Sign out everywhere" })).toBeTruthy();

    fireEvent.click(
      within(devices).getByRole("button", { name: "Sign out device: Safari on iPhone" }),
    );
    fireEvent.click(
      within(await screen.findByRole("dialog", { name: "Sign out this device?" })).getByRole(
        "button",
        { name: "Sign out device" },
      ),
    );
    await waitFor(() => {
      expect(remove).toHaveBeenCalledWith(`/api/sessions/${otherSessionId}`);
    });
    expect(
      await within(screen.getByRole("region", { name: "Notifications" })).findByText(
        "That device has been signed out.",
      ),
    ).toBeTruthy();

    fireEvent.click(within(devices).getByRole("button", { name: "Sign out other devices" }));
    fireEvent.click(
      within(await screen.findByRole("dialog", { name: "Sign out other devices?" })).getByRole(
        "button",
        { name: "Sign out other devices" },
      ),
    );
    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("/api/sessions/revoke-others");
    });
    expect(
      await within(screen.getByRole("region", { name: "Notifications" })).findByText(
        "Other devices have been signed out.",
      ),
    ).toBeTruthy();
  });

  it("signs out everywhere from the sessions section", async () => {
    window.history.pushState({}, "", "/profile");
    mockApi();
    const post = vi.spyOn(api, "post").mockResolvedValue(axiosResponse(""));

    render(<App />);

    expect(await screen.findByText("Chrome on macOS")).toBeTruthy();
    const devices = screen.getByRole("region", { name: "Signed-in devices" });
    fireEvent.click(within(devices).getByRole("button", { name: "Sign out everywhere" }));
    fireEvent.click(
      within(await screen.findByRole("dialog", { name: "Sign out everywhere?" })).getByRole(
        "button",
        { name: "Sign out everywhere" },
      ),
    );

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith("/api/sessions/revoke-all");
    });
    expect(await screen.findByRole("link", { name: "Sign in with Google" })).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: "Notifications" })).getByText(
        "You've been signed out.",
      ),
    ).toBeTruthy();
  });

  it("shows the uploaded file name and date", async () => {
    window.history.pushState({}, "", "/profile");
    mockApi({ ...plan, source_filename: "progeo-september.pdf" });

    render(<App />);

    const file = await screen.findByRole("region", { name: "Uploaded file" });
    expect(within(file).getByText("progeo-september.pdf")).toBeTruthy();
    const time = within(file).getByText(formattedUploadDate(uploadedAt));
    expect(time.tagName).toBe("TIME");
    expect(time.getAttribute("datetime")).toBe(uploadedAt);
  });

  it("hides the uploaded file when the plan has no source file", async () => {
    window.history.pushState({}, "", "/profile");
    mockApi(plan);

    render(<App />);

    expect(await screen.findByRole("region", { name: "Account" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Uploaded file" })).toBeNull();
  });

  it("hides the uploaded file when the source name is blank", async () => {
    window.history.pushState({}, "", "/profile");
    mockApi({ ...plan, source_filename: "" });

    render(<App />);

    expect(await screen.findByRole("region", { name: "Account" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Uploaded file" })).toBeNull();
  });

  it("renders nothing on the profile page until the session is signed in", () => {
    const pending = deferred<AxiosResponse>();
    vi.spyOn(api, "get").mockReturnValue(pending.promise);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ToastProvider>
          <SessionProvider>
            <Profile />
          </SessionProvider>
        </ToastProvider>
      </QueryClientProvider>,
    );

    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });
});
