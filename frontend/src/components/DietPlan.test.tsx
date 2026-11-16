import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { setLocale } from "../i18n";
import type { PlanDocument } from "../types/diet-plan";
import DietPlan from "./DietPlan";

const plan: PlanDocument = {
  days: [
    {
      day: "Lunedì",
      meals: [
        {
          meal: "Colazione",
          categories: [
            {
              category: "Bevande",
              options: [
                {
                  name: "Bevanda a base di avena con calcio e vitamine agg.",
                  amount: 250,
                  unit: "ml",
                  position: 0,
                },
                { name: "Tè", amount: 1, unit: null, position: 1 },
              ],
            },
            {
              category: "Contorni",
              options: [{ name: "Insalata mista", amount: null, unit: null, position: 0 }],
            },
          ],
        },
        {
          meal: "Pranzo",
          categories: [
            {
              category: "Primi",
              options: [{ name: "Pasta", amount: 80, unit: "g", position: 0 }],
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

describe("DietPlan", () => {
  afterEach(() => {
    cleanup();
    setLocale("en");
  });

  it("selects the first day and lists all its meals in order", () => {
    render(<DietPlan plan={plan} />);

    const select = screen.getByLabelText<HTMLSelectElement>("Day");
    expect(select.value).toBe("0");
    expect(Array.from(select.options, (option) => option.text)).toEqual(["Lunedì", "Martedì"]);

    expect(
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(["Colazione", "Pranzo"]);
    expect(screen.getByRole("heading", { level: 3, name: "Bevande" })).toBeTruthy();
    expect(
      screen.getByText("Bevanda a base di avena con calcio e vitamine agg. 250 ml"),
    ).toBeTruthy();
    expect(screen.getByText("Tè 1")).toBeTruthy();
    expect(screen.getByText("Insalata mista").textContent).toBe("Insalata mista");
    expect(screen.getByText("Pasta 80 g")).toBeTruthy();
    expect(screen.queryByText("Pesce 150 g")).toBeNull();
  });

  it("shows the meals of the day picked in the dropdown", () => {
    render(<DietPlan plan={plan} />);

    fireEvent.change(screen.getByLabelText("Day"), { target: { value: "1" } });

    expect(
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(["Cena"]);
    expect(screen.getByText("Pesce 150 g")).toBeTruthy();
    expect(screen.queryByText("Pasta 80 g")).toBeNull();
  });

  it("falls back to the first day when the selected day is no longer in the plan", () => {
    const { rerender } = render(<DietPlan plan={plan} />);
    fireEvent.change(screen.getByLabelText("Day"), { target: { value: "1" } });

    rerender(<DietPlan plan={{ days: [plan.days[0]] }} />);

    expect(screen.getByLabelText<HTMLSelectElement>("Day").value).toBe("0");
    expect(screen.getByText("Pasta 80 g")).toBeTruthy();
  });

  it("renders nothing for a plan without days", () => {
    const { container } = render(<DietPlan plan={{ days: [] }} />);

    expect(container.firstChild).toBeNull();
  });

  it("uses the current locale for the day label", () => {
    setLocale("it");

    render(<DietPlan plan={plan} />);

    expect(screen.getByLabelText("Giorno")).toBeTruthy();
  });
});
