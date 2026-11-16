import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useToast } from "../hooks/useToast";
import { setLocale } from "../i18n";
import { ToastProvider } from "./ToastContext";

import { TOAST_DURATION_MS } from "../components/Toast";

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
  return screen.getByRole("region", { name: "Notifications" });
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

  it("renders an empty polite live region", () => {
    const region = renderProvider();

    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.childElementCount).toBe(0);
  });

  it("stacks toasts of every variant, defaulting to success", () => {
    const region = renderProvider();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Fail" }));
    fireEvent.click(screen.getByRole("button", { name: "Warn" }));
    fireEvent.click(screen.getByRole("button", { name: "Inform" }));

    expect(
      Array.from(region.children, (toast) => [
        toast.textContent,
        toast.getAttribute("data-variant"),
      ]),
    ).toEqual([
      ["Saved", "success"],
      ["Failed", "error"],
      ["Careful", "warning"],
      ["Heads up", "info"],
    ]);
  });

  it("announces only error toasts as alerts", () => {
    renderProvider();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Warn" }));
    fireEvent.click(screen.getByRole("button", { name: "Fail" }));

    expect(screen.getAllByRole("alert").map((toast) => toast.textContent)).toEqual(["Failed"]);
  });

  it("removes only the dismissed toast", () => {
    const region = renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Fail" }));

    fireEvent.click(within(region).getAllByRole("button", { name: "Dismiss" })[0] as HTMLElement);

    expect(within(region).queryByText("Saved")).toBeNull();
    expect(within(region).getByText("Failed")).toBeTruthy();
  });

  it("dismisses each toast on its own timer", () => {
    const region = renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS - 1000);
    });
    fireEvent.click(screen.getByRole("button", { name: "Fail" }));
    expect(region.childElementCount).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(within(region).queryByText("Saved")).toBeNull();
    expect(within(region).getByText("Failed")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(region.childElementCount).toBe(0);
  });
});
