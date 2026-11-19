import type { ComponentProps } from "react";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import type { PlanDocument } from "../types/diet-plan";
import type { WeekChoice } from "../types/week";
import WeekPlannerDrawer from "./WeekPlannerDrawer";

import { en } from "../i18n/locales/en";
import { it as italian } from "../i18n/locales/it";

const plan: PlanDocument = {
  days: [
    {
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
    },
    {
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
    },
  ],
};

const riso: WeekChoice = {
  day: "Lunedì",
  meal: "Pranzo",
  category: "Primi",
  name: "Riso",
  amount: 70,
  unit: "g",
};

type DrawerProps = ComponentProps<typeof WeekPlannerDrawer>;

function renderDrawer(initial: Partial<DrawerProps> = {}) {
  const onDayChange = vi.fn();
  const onSave = vi.fn();
  const onClose = vi.fn();
  let props: DrawerProps = {
    open: true,
    weekStart: "2026-11-16",
    options: plan,
    choices: [],
    dayIndex: 0,
    onDayChange,
    onSave,
    saving: false,
    onClose,
    ...initial,
  };
  const rendered = render(<WeekPlannerDrawer {...props} />);
  const update = (changes: Partial<DrawerProps>) => {
    props = { ...props, ...changes };
    rendered.rerender(<WeekPlannerDrawer {...props} />);
  };
  return { onDayChange, onSave, onClose, update, ...rendered };
}

describe("WeekPlannerDrawer", () => {
  afterEach(() => {
    cleanup();
    setLocale("en");
    document.body.style.overflow = "";
  });

  it("renders nothing while closed", () => {
    renderDrawer({ open: false });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the formatted date and steps through available days", () => {
    const { onDayChange, update } = renderDrawer({ dayIndex: 0 });

    const dialog = screen.getByRole("dialog", { name: en.labels.PLAN_THIS_WEEK });
    expect(within(dialog).getByText("Monday, November 16")).toBeTruthy();

    const prev = within(dialog).getByRole<HTMLButtonElement>("button", { name: "Previous day" });
    const next = within(dialog).getByRole<HTMLButtonElement>("button", { name: "Next day" });
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    fireEvent.click(next);
    expect(onDayChange).toHaveBeenCalledWith(1);

    update({ dayIndex: 1 });
    expect(within(dialog).getByText("Tuesday, November 17")).toBeTruthy();
    expect(prev.disabled).toBe(false);
    expect(next.disabled).toBe(true);

    fireEvent.click(prev);
    expect(onDayChange).toHaveBeenCalledWith(0);
  });

  it("closes immediately on close button, Escape, or backdrop click when there are no unsaved changes", () => {
    const { onClose } = renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);

    const backdrop = document.querySelector(".drawer-backdrop") as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("asks for confirmation before discarding unsaved changes", () => {
    const { onClose } = renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: /^Primi/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Riso 70 g" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).not.toHaveBeenCalled();
    const confirm = screen.getByRole("dialog", { name: en.labels.UNSAVED_CHANGES_TITLE });
    expect(within(confirm).getByText(en.labels.UNSAVED_CHANGES_MESSAGE)).toBeTruthy();

    fireEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: en.labels.UNSAVED_CHANGES_TITLE })).toBeNull();
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Riso 70 g" }).checked).toBe(true);

    fireEvent.keyDown(window, { key: "Escape" });
    const confirmAgain = screen.getByRole("dialog", { name: en.labels.UNSAVED_CHANGES_TITLE });
    fireEvent.click(within(confirmAgain).getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalledOnce();
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

  it("locks body scroll while open and restores it on unmount", () => {
    const { unmount } = renderDrawer();

    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("falls back to the plan day label or an empty label when dayIndex is beyond the 7-day calendar", () => {
    const eightDayPlan: PlanDocument = {
      days: Array.from({ length: 8 }, (_, index) => ({
        day: `Giorno ${index + 1}`,
        meals: [],
      })),
    };
    const { update } = renderDrawer({ options: eightDayPlan, dayIndex: 7 });

    const dialog = screen.getByRole("dialog", { name: en.labels.PLAN_THIS_WEEK });
    expect(within(dialog).getByText("Giorno 8")).toBeTruthy();

    update({ dayIndex: 8 });
    expect(document.querySelector(".week-planner-drawer-date")?.textContent).toBe("");
  });

  it("uses the current locale", () => {
    setLocale("it");
    renderDrawer({ dayIndex: 0 });

    expect(screen.getByRole("dialog", { name: italian.labels.PLAN_THIS_WEEK })).toBeTruthy();
    expect(screen.getByText("lunedì 16 novembre")).toBeTruthy();
    expect(screen.getByRole("button", { name: italian.labels.CLOSE })).toBeTruthy();
    expect(screen.getByRole("button", { name: italian.labels.PREVIOUS_DAY })).toBeTruthy();
    expect(screen.getByRole("button", { name: italian.labels.NEXT_DAY })).toBeTruthy();
  });
});
