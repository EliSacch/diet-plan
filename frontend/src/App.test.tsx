import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { setLocale } from "./i18n";
import { en } from "./i18n/locales/en";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function stubFetch(...results: unknown[]) {
  const pending = [...results];
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      const next = pending.shift();
      if (next instanceof Response) {
        return Promise.resolve(next);
      }
      return Promise.reject(next);
    }),
  );
}

describe("App", () => {
  beforeEach(() => {
    setLocale("en");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the Google button when there is no session", async () => {
    stubFetch(jsonResponse({ code: "UNAUTHORIZED" }, 401));

    render(<App />);

    expect(screen.getByText("Checking your session…")).toBeTruthy();
    const link = await screen.findByRole("link", { name: "Continue with Google" });
    expect(link.getAttribute("href")).toBe("/auth/google");
    expect(vi.mocked(fetch).mock.calls[0]?.[1]).toMatchObject({ credentials: "include" });
  });

  it("shows the signed-in email and returns to the Google button after sign out", async () => {
    stubFetch(
      jsonResponse({ id: 1, email: "ada@example.com" }, 200),
      new Response(null, { status: 204 }),
    );

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Home" })).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("link", { name: "Continue with Google" })).toBeTruthy();
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toBe("/auth/logout");
    expect(vi.mocked(fetch).mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
      credentials: "include",
    });
  });

  it("shows the catalog message when the profile request fails", async () => {
    stubFetch(jsonResponse({ code: "INTERNAL_ERROR" }, 500));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.INTERNAL_ERROR,
    );
  });

  it("shows the unknown message when a failed response has no problem body", async () => {
    stubFetch(new Response("nope", { status: 500 }));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", en.errors.UNKNOWN);
  });

  it("shows an unknown error when the profile request rejects with a non-error", async () => {
    stubFetch("nope");

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Unknown error");
  });

  it("ignores an aborted profile request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        });
      }),
    );

    const { unmount } = render(<App />);
    unmount();

    await Promise.resolve();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a DOMException that is not an abort", async () => {
    stubFetch(new DOMException("The request was blocked.", "NetworkError"));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "The request was blocked.",
    );
  });

  it("shows the catalog message when sign out fails", async () => {
    stubFetch(
      jsonResponse({ id: 1, email: "ada@example.com" }, 200),
      jsonResponse({ code: "INTERNAL_ERROR" }, 500),
    );

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.INTERNAL_ERROR,
    );
    expect(screen.queryByRole("heading", { name: "Home" })).toBeNull();
  });

  it("shows an unknown error when sign out rejects with a non-error", async () => {
    stubFetch(jsonResponse({ id: 1, email: "ada@example.com" }, 200), "nope");

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Unknown error");
  });
});
