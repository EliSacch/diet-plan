import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ConfirmModal from "./ConfirmModal";

function renderModal(open: boolean) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const modal = (isOpen: boolean) => (
    <ConfirmModal
      open={isOpen}
      title="Delete plan?"
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <p>This cannot be undone.</p>
    </ConfirmModal>
  );
  const { rerender } = render(modal(open));

  return { onConfirm, onCancel, rerender: (isOpen: boolean) => rerender(modal(isOpen)) };
}

describe("ConfirmModal", () => {
  afterEach(() => {
    cleanup();
  });

  it("stays hidden while closed", () => {
    renderModal(false);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens as a labelled dialog and closes again", () => {
    const { rerender } = renderModal(true);

    const dialog = screen.getByRole("dialog", { name: "Delete plan?" });
    expect(dialog.getAttribute("aria-describedby")).toBe(
      screen.getByText("This cannot be undone.").parentElement?.id,
    );

    rerender(false);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("calls the matching handler for each action", () => {
    const { onConfirm, onCancel } = renderModal(true);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("pairs filled confirm with outline cancel for the chosen variant", () => {
    render(
      <ConfirmModal
        open
        title="Sign out everywhere?"
        confirmLabel="Sign out everywhere"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {}}
        onCancel={() => {}}
      >
        <p>You will be signed out on every device.</p>
      </ConfirmModal>,
    );

    expect(screen.getByRole("button", { name: "Sign out everywhere" }).className).toContain(
      "btn-danger",
    );
    expect(screen.getByRole("button", { name: "Cancel" }).className).toContain(
      "btn-danger-secondary",
    );
  });

  it("cancels on Escape without letting the browser close the dialog itself", () => {
    const { onCancel } = renderModal(true);
    const dialog = screen.getByRole("dialog");

    const cancel = createEvent("cancel", dialog, { cancelable: true });
    fireEvent(dialog, cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("cancels on backdrop clicks but not on clicks inside the content", () => {
    const { onCancel } = renderModal(true);

    fireEvent.click(screen.getByText("This cannot be undone."));
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("dialog"));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
