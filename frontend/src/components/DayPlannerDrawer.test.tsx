import type { ComponentProps } from "react";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import type { DayChoice } from "../types/day";
import type { PlanDay } from "../types/diet-plan";
import { weekdayIndex } from "../utils/date";
import DayPlannerDrawer from "./DayPlannerDrawer";

import { en } from "../i18n/locales/en";
import { it as italian } from "../i18n/locales/it";

const monday: PlanDay = {
  day: "Lunedì",
  meals: [
    {
      meal: "Pranzo",
      categories: [
        {
          category: "Primi",
          options: [
            { name: "Pasta", amount: 80, unit: "g", position: 0 },
            { name: "Riso", amount: 70, unit: "g", position: 1 },
          ],
        },
      ],
    },
  ],
};

const tuesday: PlanDay = {
  day: "Martedì",
  meals: [
    {
      meal: "Cena",
      categories: [
        {
          category: "Secondi",
          options: [{ name: "Pesce", amount: 150, unit: "g", position: 0 }],
        },
      ],
    },
  ],
};

const riso: DayChoice = {
  meal: "Pranzo",
  category: "Primi",
  name: "Riso",
  amount: 70,
  unit: "g",
};

type DrawerProps = ComponentProps<typeof DayPlannerDrawer>;

function renderDrawer(initial: Partial<DrawerProps> = {}) {
  const onDateChange = vi.fn();
  const onSave = vi.fn();
  const onClose = vi.fn();
  let props: DrawerProps = {
    open: true,
    date: "2026-11-16",
    day: monday,
    choices: [],
    onDateChange,
    onSave,
    saving: false,
    onClose,
    ...initial,
  };
  const rendered = render(<DayPlannerDrawer {...props} />);
  const update = (changes: Partial<DrawerProps>) => {
    props = { ...props, ...changes };
    rendered.rerender(<DayPlannerDrawer {...props} />);
  };
  return { onDateChange, onSave, onClose, update, ...rendered };
}

describe("DayPlannerDrawer", () => {
  afterEach(() => {
    cleanup();
    setLocale("en");
    document.body.style.overflow = "";
  });

  it("renders nothing while closed", () => {
    renderDrawer({ open: false });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows loading and error states inside the drawer body", () => {
    const { update } = renderDrawer({ loading: true, choices: undefined });

    expect(screen.getByRole("status")).toBeTruthy();

    update({ loading: false, error: "Could not load day." });
    expect(screen.getByRole("alert").textContent).toBe("Could not load day.");

    update({ error: null, day: undefined, date: "not-a-date" });
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("shows the formatted date, steps across days, and skips disabled weekdays", () => {
    const { onDateChange, update } = renderDrawer({
      date: "2026-11-17",
      day: tuesday,
      isDateDisabled: (date) => weekdayIndex(date) >= 2,
    });

    const dialog = screen.getByRole("dialog", { name: en.labels.PLAN_THIS_DAY });
    expect(within(dialog).getByText("Tuesday, November 17")).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Next day" }));
    expect(onDateChange).toHaveBeenCalledWith("2026-11-23");

    fireEvent.click(within(dialog).getByRole("button", { name: "Previous day" }));
    expect(onDateChange).toHaveBeenCalledWith("2026-11-16");

    update({ date: "not-a-date", isDateDisabled: () => true });
    expect(within(dialog).getByText("Martedì")).toBeTruthy();
    expect(
      within(dialog).getByRole<HTMLButtonElement>("button", { name: "Previous day" }).disabled,
    ).toBe(true);
    expect(
      within(dialog).getByRole<HTMLButtonElement>("button", { name: "Next day" }).disabled,
    ).toBe(true);

    update({ date: "2026-11-16", isDateDisabled: () => true });
    expect(
      within(dialog).getByRole<HTMLButtonElement>("button", { name: "Previous day" }).disabled,
    ).toBe(true);
  });

  it("closes immediately on close button, Escape, or backdrop click when clean", () => {
    const { onClose } = renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);

    const backdrop = document.querySelector(".drawer-backdrop") as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("asks for confirmation before discarding unsaved changes on close or day step", () => {
    const { onClose, onDateChange, update } = renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: /^Primi/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Riso 70 g" }));

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).not.toHaveBeenCalled();

    const confirmClose = screen.getByRole("dialog", { name: en.labels.UNSAVED_CHANGES_TITLE });
    fireEvent.click(within(confirmClose).getByRole("button", { name: "Cancel" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Riso 70 g" }).checked).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: en.labels.UNSAVED_CHANGES_TITLE })).getByRole(
        "button",
        { name: "Discard" },
      ),
    );
    expect(onClose).toHaveBeenCalledOnce();
    update({ open: false });
    update({ open: true });

    fireEvent.click(screen.getByRole("button", { name: /^Primi/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Pasta 80 g" }));
    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    expect(onDateChange).not.toHaveBeenCalled();

    fireEvent.click(
      within(screen.getByRole("dialog", { name: en.labels.UNSAVED_CHANGES_TITLE })).getByRole(
        "button",
        { name: "Discard" },
      ),
    );
    expect(onDateChange).toHaveBeenCalledWith("2026-11-17");

    update({ date: "2026-11-17", day: tuesday, choices: [] });
    expect(screen.getByText("Tuesday, November 17")).toBeTruthy();
  });

  it("closes without prompting once saved choices catch up with the picks", () => {
    const { onClose, onSave, update } = renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: /^Primi/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Riso 70 g" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith([riso]);

    update({ choices: [riso] });

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog", { name: en.labels.UNSAVED_CHANGES_TITLE })).toBeNull();
  });

  it("uses the current locale", () => {
    setLocale("it");
    renderDrawer({ date: "2026-11-16" });

    expect(screen.getByRole("dialog", { name: italian.labels.PLAN_THIS_DAY })).toBeTruthy();
    expect(screen.getByText("lunedì 16 novembre")).toBeTruthy();
    expect(screen.getByRole("button", { name: italian.labels.CLOSE })).toBeTruthy();
    expect(screen.getByRole("button", { name: italian.labels.PREVIOUS_DAY })).toBeTruthy();
    expect(screen.getByRole("button", { name: italian.labels.NEXT_DAY })).toBeTruthy();
  });
});
