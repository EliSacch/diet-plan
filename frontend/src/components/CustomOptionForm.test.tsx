import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import { deferred } from "../test/http";
import CustomOptionForm from "./CustomOptionForm";

import { en } from "../i18n/locales/en";
import { it as italian } from "../i18n/locales/it";

function renderForm(onSubmit = vi.fn(() => Promise.resolve())) {
  const onCancel = vi.fn();
  render(<CustomOptionForm onSubmit={onSubmit} onCancel={onCancel} />);
  return { onSubmit, onCancel };
}

function input(name: string) {
  return screen.getByLabelText<HTMLInputElement>(name);
}

function fill({ name = "", amount = "", unit = "" }) {
  fireEvent.change(input("Name"), { target: { value: name } });
  fireEvent.change(input("Amount"), { target: { value: amount } });
  fireEvent.change(input("Unit"), { target: { value: unit } });
}

function add() {
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
}

describe("CustomOptionForm", () => {
  afterEach(() => {
    cleanup();
    setLocale("en");
  });

  it("starts empty with the name focused", () => {
    renderForm();

    expect(screen.getByRole("form", { name: en.labels.ADD_CUSTOM_OPTION })).toBeTruthy();
    expect(input("Name").value).toBe("");
    expect(input("Amount").value).toBe("");
    expect(input("Unit").value).toBe("");
    expect(document.activeElement).toBe(input("Name"));
  });

  it("submits the trimmed values", async () => {
    const { onSubmit } = renderForm();

    fill({ name: " Pasta di farro ", amount: "70", unit: " g " });
    await act(async () => add());

    expect(onSubmit).toHaveBeenCalledWith({ name: "Pasta di farro", amount: 70, unit: "g" });
  });

  it("submits blank amount and unit as missing", async () => {
    const { onSubmit } = renderForm();

    fill({ name: "Insalata mista" });
    await act(async () => add());

    expect(onSubmit).toHaveBeenCalledWith({ name: "Insalata mista", amount: null, unit: null });
  });

  it("shows field errors instead of submitting", () => {
    const { onSubmit } = renderForm();

    fill({ name: "", amount: "0", unit: "x".repeat(201) });
    add();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(en.labels.NAME_REQUIRED)).toBeTruthy();
    expect(screen.getByText(en.labels.AMOUNT_INVALID)).toBeTruthy();
    expect(screen.getByText(en.labels.UNIT_TOO_LONG).id).toBe(
      input("Unit").getAttribute("aria-describedby"),
    );
    expect(input("Unit").getAttribute("aria-invalid")).toBe("true");

    fill({ name: "Pasta", amount: "70", unit: "x".repeat(201) });
    add();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByText(en.labels.NAME_REQUIRED)).toBeNull();
    expect(screen.queryByText(en.labels.AMOUNT_INVALID)).toBeNull();
    expect(screen.getByText(en.labels.UNIT_TOO_LONG)).toBeTruthy();

    fill({ name: " ", unit: "g" });
    add();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(en.labels.NAME_REQUIRED)).toBeTruthy();
    expect(screen.queryByText(en.labels.UNIT_TOO_LONG)).toBeNull();
  });

  it("is busy while submitting and can retry after a failure", async () => {
    const pending = deferred<void>();
    const onSubmit = vi.fn(() => pending.promise);
    renderForm(onSubmit);

    fill({ name: "Pasta di farro", amount: "70", unit: "g" });
    add();

    const addButton = screen.getByRole<HTMLButtonElement>("button", { name: "Add" });
    expect(addButton.disabled).toBe(true);
    expect(addButton.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Cancel" }).disabled).toBe(true);

    await act(async () => pending.reject(new Error("conflict")));

    expect(addButton.disabled).toBe(false);
    expect(input("Name").value).toBe("Pasta di farro");
  });

  it("cancels without submitting", () => {
    const { onSubmit, onCancel } = renderForm();

    fill({ name: "Pasta" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("uses the current locale", () => {
    setLocale("it");
    renderForm();

    expect(screen.getByRole("form", { name: italian.labels.ADD_CUSTOM_OPTION })).toBeTruthy();
    expect(screen.getByLabelText(italian.labels.UNIT)).toBeTruthy();
    expect(screen.getByRole("button", { name: italian.labels.ADD })).toBeTruthy();
  });
});
