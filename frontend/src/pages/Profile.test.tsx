import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { SessionProvider } from "../context/SessionContext";
import { ToastProvider } from "../context/ToastContext";
import { getLocale, setLocale } from "../i18n";
import { axiosFailure, axiosResponse, deferred } from "../test/http";
import type { ActiveDietPlan } from "../types/diet-plan";
import Profile from "./Profile";

import App from "../App";

import { en } from "../i18n/locales/en";

import type { AxiosResponse } from "axios";

const uploadedAt = "2026-03-15T09:05:00.000Z";

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

function mockApi(activePlan?: ActiveDietPlan | null) {
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
    return Promise.reject(new Error(`Unexpected ${url}`));
  });
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
