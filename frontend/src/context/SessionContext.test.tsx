import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { setLocale } from "../i18n";
import { axiosFailure, axiosResponse } from "../test/http";

import App from "../App";

import { en } from "../i18n/locales/en";

describe("SessionProvider", () => {
  beforeEach(() => {
    setLocale("en");
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("shows the catalog message when the profile request fails", async () => {
    vi.spyOn(api, "get").mockRejectedValue(axiosFailure(500, { code: "INTERNAL_ERROR" }));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.INTERNAL_ERROR,
    );
  });

  it("shows the unknown message when a failed response has no problem body", async () => {
    vi.spyOn(api, "get").mockRejectedValue(axiosFailure(500, ""));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", en.errors.UNKNOWN);
  });

  it("shows an error message when the profile request rejects with an Error", async () => {
    vi.spyOn(api, "get").mockRejectedValue(new Error("The request was blocked."));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "The request was blocked.",
    );
  });

  it("shows an unknown error when the profile request rejects with a non-error", async () => {
    vi.spyOn(api, "get").mockRejectedValue("nope");

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Unknown error");
  });

  it("ignores an aborted profile request", async () => {
    vi.spyOn(api, "get").mockImplementation((_url, config) => {
      return new Promise((_resolve, reject) => {
        config?.signal?.addEventListener?.("abort", () => {
          reject(new AxiosError("canceled", AxiosError.ERR_CANCELED));
        });
      });
    });

    const { unmount } = render(<App />);
    unmount();

    await Promise.resolve();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the catalog message when sign out fails", async () => {
    window.history.pushState({}, "", "/profile");
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse({ id: 1, email: "ada@example.com" }));
    vi.spyOn(api, "post").mockRejectedValue(axiosFailure(500, { code: "INTERNAL_ERROR" }));

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.INTERNAL_ERROR,
    );
    expect(screen.queryByRole("heading", { name: "Home" })).toBeNull();
  });

  it("shows an unknown error when sign out rejects with a non-error", async () => {
    window.history.pushState({}, "", "/profile");
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse({ id: 1, email: "ada@example.com" }));
    vi.spyOn(api, "post").mockRejectedValue("nope");

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Unknown error");
  });
});
