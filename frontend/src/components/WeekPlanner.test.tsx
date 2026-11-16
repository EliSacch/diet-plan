import type { ComponentProps } from "react";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import type { PlanDocument } from "../types/diet-plan";
import type { WeekChoice } from "../types/week";
import WeekPlanner from "./WeekPlanner";

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
                { name: "Pasta", amount: 100, unit: "g", position: 1 },
                { name: "Riso", amount: 70, unit: "g", position: 2 },
              ],
            },
            {
              category: "Contorni",
              options: [{ name: "Insalata mista", amount: null, unit: null, position: 0 }],
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
              options: [
                { name: "Pesce", amount: 150, unit: "g", position: 0 },
                { name: "Uova", amount: 2, unit: null, position: 1 },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const pasta80: WeekChoice = {
  day: "Lunedì",
  meal: "Pranzo",
  category: "Primi",
  name: "Pasta",
  amount: 80,
  unit: "g",
};

const uova: WeekChoice = {
  day: "Martedì",
  meal: "Cena",
  category: "Secondi",
  name: "Uova",
  amount: 2,
  unit: null,
};

type PlannerProps = ComponentProps<typeof WeekPlanner>;

let updatePlanner: (changes: Partial<PlannerProps>) => void;

function renderPlanner(initial: Partial<PlannerProps> = {}) {
  const onSave = vi.fn();
  let props: PlannerProps = {
    options: plan,
    choices: [],
    dayIndex: 0,
    onSave,
    saving: false,
    ...initial,
  };
  const rendered = render(<WeekPlanner {...props} />);
  updatePlanner = (changes) => {
    props = { ...props, ...changes };
    rendered.rerender(<WeekPlanner {...props} />);
  };
  return { onSave, ...rendered };
}

function group(name: string) {
  return within(screen.getByRole("radiogroup", { name }));
}

function radio(groupName: string, label: string) {
  return group(groupName).getByRole<HTMLInputElement>("radio", { name: label });
}

function chooseDay(day: string) {
  updatePlanner({ dayIndex: plan.days.findIndex((item) => item.day === day) });
}

function toggle(category: string) {
  return screen.getByRole<HTMLButtonElement>("button", { name: new RegExp(`^${category}`) });
}

function saveButton() {
  return screen.getByRole<HTMLButtonElement>("button", { name: "Save" });
}

describe("WeekPlanner", () => {
  afterEach(() => {
    cleanup();
    setLocale("en");
  });

  it("shows the selected day with only its first category open and nothing picked", () => {
    renderPlanner();

    expect(screen.getByRole("heading", { level: 2, name: "Pranzo" })).toBeTruthy();
    expect(toggle("Primi").getAttribute("aria-expanded")).toBe("true");
    expect(group("Primi").getAllByRole("radio")).toHaveLength(3);
    expect(radio("Primi", "Pasta 80 g").checked).toBe(false);
    expect(toggle("Contorni").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("radiogroup", { name: "Contorni" })).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: "Secondi" })).toBeNull();
    expect(saveButton().disabled).toBe(true);
  });

  it("opens one category at a time and scrolls the opened heading into view", () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    renderPlanner();

    fireEvent.click(toggle("Contorni"));

    expect(toggle("Contorni").getAttribute("aria-expanded")).toBe("true");
    expect(toggle("Primi").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("radiogroup", { name: "Primi" })).toBeNull();
    expect(radio("Contorni", "Insalata mista")).toBeTruthy();
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.contexts[0]).toBe(toggle("Contorni"));
    scroll.mockRestore();
  });

  it("collapses the open category when its heading is clicked again", () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    renderPlanner();

    fireEvent.click(toggle("Primi"));

    expect(toggle("Primi").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(scroll).not.toHaveBeenCalled();
    scroll.mockRestore();
  });

  it("shows the pick in a collapsed heading", () => {
    renderPlanner({ choices: [pasta80] });

    fireEvent.click(toggle("Contorni"));

    expect(toggle("Primi").textContent).toBe("PrimiPasta 80 g");
    expect(toggle("Contorni").textContent).toBe("Contorni");
  });

  it("opens the first category of a day when switching day", () => {
    renderPlanner();

    fireEvent.click(toggle("Contorni"));
    chooseDay("Martedì");
    expect(toggle("Secondi").getAttribute("aria-expanded")).toBe("true");

    chooseDay("Lunedì");
    expect(toggle("Primi").getAttribute("aria-expanded")).toBe("true");
    expect(toggle("Contorni").getAttribute("aria-expanded")).toBe("false");
  });

  it.each([
    ["no meals", []],
    ["a meal without categories", [{ meal: "Pranzo", categories: [] }]],
  ])("handles a day with %s", (_label, meals) => {
    renderPlanner({ options: { days: [{ day: "Lunedì", meals }] } });

    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(saveButton().disabled).toBe(true);
  });

  it("keeps picks across days and saves a partial week in plan order", () => {
    const { onSave } = renderPlanner();

    chooseDay("Martedì");
    fireEvent.click(radio("Secondi", "Uova 2"));
    chooseDay("Lunedì");
    fireEvent.click(radio("Primi", "Riso 70 g"));
    fireEvent.click(radio("Primi", "Pasta 80 g"));

    expect(radio("Primi", "Pasta 80 g").checked).toBe(true);
    expect(radio("Primi", "Riso 70 g").checked).toBe(false);
    chooseDay("Martedì");
    expect(radio("Secondi", "Uova 2").checked).toBe(true);

    fireEvent.click(saveButton());

    expect(onSave).toHaveBeenCalledWith([pasta80, uova]);
  });

  it("preselects saved choices by name, amount and unit", () => {
    renderPlanner({ choices: [pasta80] });

    expect(radio("Primi", "Pasta 80 g").checked).toBe(true);
    expect(radio("Primi", "Pasta 100 g").checked).toBe(false);
    expect(saveButton().disabled).toBe(true);
  });

  it("enables Save only while the picks differ from the saved week", () => {
    renderPlanner({ choices: [pasta80] });

    fireEvent.click(radio("Primi", "Riso 70 g"));
    expect(saveButton().disabled).toBe(false);

    fireEvent.click(radio("Primi", "Pasta 80 g"));
    expect(saveButton().disabled).toBe(true);

    fireEvent.click(toggle("Contorni"));
    fireEvent.click(radio("Contorni", "Insalata mista"));
    expect(saveButton().disabled).toBe(false);
  });

  it("disables Save once the saved week catches up with the picks", () => {
    renderPlanner();

    fireEvent.click(radio("Primi", "Pasta 80 g"));
    fireEvent.click(saveButton());
    updatePlanner({ choices: [pasta80] });

    expect(radio("Primi", "Pasta 80 g").checked).toBe(true);
    expect(saveButton().disabled).toBe(true);
  });

  it("keeps saved picks that are no longer in the plan when saving", () => {
    const removed: WeekChoice = {
      day: "Domenica",
      meal: "Cena",
      category: "Pizza",
      name: "Margherita",
      amount: 1,
      unit: null,
    };
    const { onSave } = renderPlanner({ choices: [removed] });

    fireEvent.click(radio("Primi", "Pasta 80 g"));
    fireEvent.click(saveButton());

    expect(onSave).toHaveBeenCalledWith([pasta80, removed]);
  });

  it("shows a busy, disabled button while saving", () => {
    renderPlanner({ choices: [pasta80], saving: true });

    fireEvent.click(radio("Primi", "Riso 70 g"));

    const button = screen.getByRole<HTMLButtonElement>("button", { name: "Saving…" });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it.each([
    ["a plan without days", { options: { days: [] } }],
    ["a day outside the plan", { dayIndex: 5 }],
  ])("renders nothing for %s", (_label, props) => {
    const { container } = renderPlanner(props);

    expect(container.innerHTML).toBe("");
  });

  it("uses the current locale for the button", () => {
    setLocale("it");
    renderPlanner();

    expect(screen.getByRole("button", { name: "Salva" })).toBeTruthy();
  });
});
