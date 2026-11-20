import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import Drawer from "./Drawer";

import { it as italian } from "../i18n/locales/it";

function renderDrawer({
  open = true,
  title = "Details",
  onClose = vi.fn(),
  headerExtras,
  closeDisabled = false,
}: {
  open?: boolean;
  title?: string;
  onClose?: () => void;
  headerExtras?: ReactNode;
  closeDisabled?: boolean;
} = {}) {
  const rendered = render(
    <Drawer
      open={open}
      title={title}
      onClose={onClose}
      headerExtras={headerExtras}
      closeDisabled={closeDisabled}
    >
      <p>Drawer content</p>
    </Drawer>,
  );
  return { onClose, ...rendered };
}

describe("Drawer", () => {
  afterEach(() => {
    cleanup();
    setLocale("en");
    document.body.style.overflow = "";
  });

  it("renders nothing while closed", () => {
    renderDrawer({ open: false });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders a labelled modal dialog with optional header extras and body content", () => {
    renderDrawer({ headerExtras: <p>Subtitle</p> });

    const dialog = screen.getByRole("dialog", { name: "Details" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(within(dialog).getByText("Subtitle")).toBeTruthy();
    expect(within(dialog).getByText("Drawer content")).toBeTruthy();
  });

  it("focuses the close button, locks body scroll, and restores overflow on unmount", () => {
    const { unmount } = renderDrawer();

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("calls onClose on close button click, Escape, and backdrop click, but not inside clicks", () => {
    const { onClose } = renderDrawer();

    fireEvent.click(screen.getByText("Drawer content"));
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);

    const backdrop = document.querySelector(".drawer-backdrop") as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("ignores Escape and backdrop clicks while closeDisabled is true", () => {
    const { onClose } = renderDrawer({ closeDisabled: true });

    fireEvent.keyDown(window, { key: "Escape" });
    const backdrop = document.querySelector(".drawer-backdrop") as HTMLElement;
    fireEvent.click(backdrop);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps Tab inside the dialog and restores focus on close", () => {
    const opener = document.createElement("button");
    opener.type = "button";
    opener.textContent = "Open";
    document.body.appendChild(opener);
    opener.focus();

    const { unmount, container } = render(
      <>
        <button type="button">Outside</button>
        <Drawer open title="Details" onClose={vi.fn()}>
          <button type="button">Inside</button>
        </Drawer>
        <dialog>Confirm</dialog>
      </>,
    );

    const close = screen.getByRole("button", { name: "Close" });
    const inside = screen.getByRole("button", { name: "Inside" });
    const outside = container.querySelector("button");
    expect(document.activeElement).toBe(close);
    expect(outside?.textContent).toBe("Outside");
    expect(outside?.hasAttribute("inert")).toBe(true);
    expect(document.querySelector("dialog")?.hasAttribute("inert")).toBe(false);

    inside.focus();
    const leave = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    inside.dispatchEvent(leave);
    expect(leave.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);

    const reenter = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    close.dispatchEvent(reenter);
    expect(reenter.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(inside);

    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("tabs through one radio in each group and skips hidden or disabled controls", () => {
    render(
      <>
        <button type="button">Outside</button>
        <Drawer open title="Details" onClose={vi.fn()}>
          <button type="button" hidden>
            Hidden
          </button>
          <button type="button" tabIndex={-1}>
            Skipped
          </button>
          <button type="button" disabled>
            Disabled
          </button>
          <input aria-label="Note" />
          <input type="radio" aria-label="Nameless" />
          <input type="radio" name="a" aria-label="A on" defaultChecked />
          <input type="radio" name="a" aria-label="A off" />
          <input type="radio" name="b" aria-label="B first" />
          <input type="radio" name="b" aria-label="B second" />
          <input type="radio" name="c" aria-label="C disabled" disabled />
          <input type="radio" name="c" aria-label="C enabled" />
          <span hidden>
            <input type="radio" name="d" aria-label="D hidden" />
          </span>
          <input type="radio" name="d" aria-label="D shown" />
          <input type="radio" name="e" aria-label="E skipped" tabIndex={-1} />
          <input type="radio" name="e" aria-label="E shown" />
        </Drawer>
      </>,
    );

    const outside = screen.getByRole("button", { name: "Outside" });
    const ignored = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    outside.dispatchEvent(ignored);
    expect(ignored.defaultPrevented).toBe(false);

    const close = screen.getByRole("button", { name: "Close" });
    close.focus();
    const stay = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    close.dispatchEvent(stay);
    expect(stay.defaultPrevented).toBe(false);

    const last = screen.getByRole("radio", { name: "E shown" });
    last.focus();
    const wrap = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    last.dispatchEvent(wrap);
    expect(wrap.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);
  });

  it("stops marking ancestors inert when the drawer is not in the document", () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    act(() => {
      root.render(
        <Drawer open title="Details" onClose={vi.fn()}>
          <p>Body</p>
        </Drawer>,
      );
    });

    expect(host.querySelector("[role='dialog']")).toBeTruthy();
    act(() => root.unmount());
  });

  it("uses the current locale for the close button", () => {
    setLocale("it");
    renderDrawer();

    expect(screen.getByRole("button", { name: italian.labels.CLOSE })).toBeTruthy();
  });
});
