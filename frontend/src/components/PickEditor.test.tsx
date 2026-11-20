import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import type { OptionValues } from "../types/day";
import PickEditor from "./PickEditor";

import { en } from "../i18n/locales/en";
import { it as italian } from "../i18n/locales/it";

const pasta: OptionValues = { name: "Pasta", amount: 80, unit: "g" };

function renderEditor(pick: OptionValues = pasta) {
  const onApply = vi.fn();
  const onCancel = vi.fn();
  render(<PickEditor pick={pick} onApply={onApply} onCancel={onCancel} />);
  return { onApply, onCancel };
}

function nameInput() {
  return screen.getByRole<HTMLInputElement>("textbox", { name: "Name" });
}

function amountInput() {
  return screen.getByRole<HTMLInputElement>("spinbutton", { name: "Amount" });
}

function apply() {
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
}

describe("PickEditor", () => {
  afterEach(() => {
    cleanup();
    setLocale("en");
  });

  it("starts from the pick, shows its unit, and focuses the name", () => {
    renderEditor();

    expect(screen.getByRole("form", { name: en.labels.EDIT_PICK })).toBeTruthy();
    expect(nameInput().value).toBe("Pasta");
    expect(amountInput().value).toBe("80");
    expect(screen.getByText("g").id).toBe(amountInput().getAttribute("aria-describedby"));
    expect(document.activeElement).toBe(nameInput());
  });

  it("starts with an empty amount and no unit for a pick without them", () => {
    renderEditor({ name: "Insalata mista", amount: null, unit: null });

    expect(amountInput().value).toBe("");
    expect(screen.queryByText("g")).toBeNull();
    expect(amountInput().getAttribute("aria-describedby")).toBeNull();
  });

  it("applies a new amount", () => {
    const { onApply } = renderEditor();

    fireEvent.change(amountInput(), { target: { value: "100" } });
    apply();

    expect(onApply).toHaveBeenCalledWith({ name: "Pasta", amount: 100 });
  });

  it("applies a new name, trimmed", () => {
    const { onApply } = renderEditor();

    fireEvent.change(nameInput(), { target: { value: "  Pasta integrale " } });
    fireEvent.submit(screen.getByRole("form"));

    expect(onApply).toHaveBeenCalledWith({ name: "Pasta integrale", amount: 80 });
  });

  it("applies a cleared amount as no amount", () => {
    const { onApply } = renderEditor();

    fireEvent.change(amountInput(), { target: { value: "" } });
    apply();

    expect(onApply).toHaveBeenCalledWith({ name: "Pasta", amount: null });
  });

  it("shows field errors instead of applying invalid values", () => {
    const { onApply } = renderEditor();

    fireEvent.change(nameInput(), { target: { value: " " } });
    fireEvent.change(amountInput(), { target: { value: "0" } });
    apply();

    expect(onApply).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(nameInput());
    expect(nameInput().getAttribute("aria-invalid")).toBe("true");
    expect(amountInput().getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(en.labels.NAME_REQUIRED).id).toBe(
      nameInput().getAttribute("aria-describedby"),
    );
    expect(amountInput().getAttribute("aria-describedby")).toBe(
      `${screen.getByText("g").id} ${screen.getByText(en.labels.AMOUNT_INVALID).id}`,
    );

    fireEvent.change(nameInput(), { target: { value: "x".repeat(301) } });
    fireEvent.change(amountInput(), { target: { value: "90" } });
    apply();

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByText(en.labels.NAME_TOO_LONG)).toBeTruthy();
    expect(screen.queryByText(en.labels.AMOUNT_INVALID)).toBeNull();
    expect(amountInput().getAttribute("aria-invalid")).toBe("false");
    expect(amountInput().getAttribute("aria-describedby")).toBe(screen.getByText("g").id);

    fireEvent.change(nameInput(), { target: { value: "Pasta" } });
    apply();
    expect(onApply).toHaveBeenCalledWith({ name: "Pasta", amount: 90 });
  });

  it("focuses the amount when it is the first invalid field", () => {
    renderEditor();

    fireEvent.change(amountInput(), { target: { value: "0" } });
    apply();

    expect(document.activeElement).toBe(amountInput());
  });

  it("cancels without applying", () => {
    const { onApply, onCancel } = renderEditor();

    fireEvent.change(amountInput(), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("uses the current locale", () => {
    setLocale("it");
    renderEditor();

    expect(screen.getByRole("form", { name: italian.labels.EDIT_PICK })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: italian.labels.NAME })).toBeTruthy();
    expect(screen.getByRole("spinbutton", { name: italian.labels.AMOUNT })).toBeTruthy();
    expect(screen.getByRole("button", { name: italian.labels.APPLY })).toBeTruthy();
  });
});
