import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useToast } from "../hooks/useToast";
import { setLocale } from "../i18n";
import { ToastProvider } from "./ToastContext";

import { TOAST_DURATION_MS } from "../components/Toast";

import { en } from "../i18n/locales/en";

function Trigger() {
  const showToast = useToast();
  return (
    <>
      <button type="button" onClick={() => showToast({ message: "Saved" })}>
        Save
      </button>
      <button type="button" onClick={() => showToast({ message: "Failed", variant: "error" })}>
        Fail
      </button>
      <button type="button" onClick={() => showToast({ message: "Careful", variant: "warning" })}>
        Warn
      </button>
      <button type="button" onClick={() => showToast({ message: "Heads up", variant: "info" })}>
        Inform
      </button>
    </>
  );
}

function renderProvider() {
  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );
  return {
    polite: screen.getByRole("region", { name: en.labels.NOTIFICATIONS }),
    assertive: screen.getByRole("region", { name: en.labels.ERRORS }),
  };
}

describe("ToastProvider", () => {
  beforeEach(() => {
    setLocale("en");
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders an empty polite region and an empty assertive region", () => {
    const { polite, assertive } = renderProvider();

    expect(polite.getAttribute("aria-live")).toBe("polite");
    expect(assertive.getAttribute("aria-live")).toBe("assertive");
    expect(polite.childElementCount).toBe(0);
    expect(assertive.childElementCount).toBe(0);
  });

  it("stacks toasts of every variant, defaulting to success", () => {
    const { polite, assertive } = renderProvider();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Fail" }));
    fireEvent.click(screen.getByRole("button", { name: "Warn" }));
    fireEvent.click(screen.getByRole("button", { name: "Inform" }));

    expect(
      Array.from(polite.children, (toast) => [
        toast.textContent,
        toast.getAttribute("data-variant"),
      ]),
    ).toEqual([
      ["Saved", "success"],
      ["Careful", "warning"],
      ["Heads up", "info"],
    ]);
    expect(
      within(assertive).getByText("Failed").closest("[data-variant]")?.getAttribute("data-variant"),
    ).toBe("error");
    expect(assertive.querySelector("[role='alert']")).toBeNull();
  });

  it("removes only the dismissed toast", () => {
    const { polite, assertive } = renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Fail" }));

    fireEvent.click(within(polite).getByRole("button", { name: "Dismiss: Saved" }));

    expect(within(polite).queryByText("Saved")).toBeNull();
    expect(within(assertive).getByText("Failed")).toBeTruthy();
  });

  it("dismisses a notice on its timer and keeps an error until dismissed", () => {
    const { polite, assertive } = renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS - 1000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Fail" }));
    expect(polite.childElementCount).toBe(1);
    expect(assertive.childElementCount).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(within(polite).queryByText("Saved")).toBeNull();
    expect(within(assertive).getByText("Failed")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(assertive.childElementCount).toBe(1);

    const error = within(assertive).getByText("Failed").closest(".toast") as HTMLElement;
    fireEvent.pointerEnter(error);
    fireEvent.pointerLeave(error);
    expect(within(assertive).getByText("Failed")).toBeTruthy();
  });

  it("pauses a notice while the pointer or focus is on it", () => {
    vi.setSystemTime(new Date("2026-11-20T00:00:00Z"));
    const { polite } = renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const toast = within(polite).getByText("Saved").closest(".toast") as HTMLElement;

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    fireEvent.pointerEnter(toast);
    fireEvent.focus(toast);
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(within(polite).getByText("Saved")).toBeTruthy();

    fireEvent.pointerLeave(toast);
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(within(polite).getByText("Saved")).toBeTruthy();

    fireEvent.blur(toast);
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS - 2000);
    });
    expect(within(polite).queryByText("Saved")).toBeNull();
  });
});
