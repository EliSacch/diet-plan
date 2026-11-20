import type { ComponentProps } from "react";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import type { PlanDocument } from "../types/diet-plan";
import DietPlan from "./DietPlan";

import { en } from "../i18n/locales/en";
import { it as italian } from "../i18n/locales/it";

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

function renderPlan(
  document: PlanDocument = plan,
  props: Partial<ComponentProps<typeof DietPlan>> = {},
) {
  const onMultiSelectChange = vi.fn();
  const view = render(
    <DietPlan
      plan={document}
      multiSelect={new Set()}
      onMultiSelectChange={onMultiSelectChange}
      {...props}
    />,
  );
  return { ...view, onMultiSelectChange };
}

describe("DietPlan", () => {
  afterEach(() => {
    cleanup();
    setLocale("en");
  });

  it("selects the first day and lists all its meals in order", () => {
    renderPlan();

    const select = screen.getByLabelText<HTMLSelectElement>("Day");
    expect(select.value).toBe("0");
    expect(Array.from(select.options, (option) => option.text)).toEqual(["Lunedì", "Martedì"]);

    expect(
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([en.labels.PLAN_OPTIONS, "Colazione", "Pranzo"]);
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
    renderPlan();

    fireEvent.change(screen.getByLabelText("Day"), { target: { value: "1" } });

    expect(
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([en.labels.PLAN_OPTIONS, "Cena"]);
    expect(screen.getByText("Pesce 150 g")).toBeTruthy();
    expect(screen.queryByText("Pasta 80 g")).toBeNull();
  });

  it("falls back to the first day when the selected day is no longer in the plan", () => {
    const { rerender } = renderPlan();
    fireEvent.change(screen.getByLabelText("Day"), { target: { value: "1" } });

    rerender(
      <DietPlan
        plan={{ days: [plan.days[0]] }}
        multiSelect={new Set()}
        onMultiSelectChange={() => {}}
      />,
    );

    expect(screen.getByLabelText<HTMLSelectElement>("Day").value).toBe("0");
    expect(screen.getByText("Pasta 80 g")).toBeTruthy();
  });

  it("renders nothing for a plan without days", () => {
    const { container } = renderPlan({ days: [] });

    expect(container.firstChild).toBeNull();
  });

  it("uses the current locale for the day label", () => {
    setLocale("it");

    renderPlan();

    expect(screen.getByLabelText("Giorno")).toBeTruthy();
  });

  it("shows one switch per category name and keeps it when the day changes", () => {
    const { onMultiSelectChange } = renderPlan(
      {
        days: [
          {
            day: "Lunedì",
            meals: [
              {
                meal: "Colazione",
                categories: [
                  {
                    category: "Contorni",
                    options: [{ name: "Insalata", amount: null, unit: null, position: 0 }],
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
                  {
                    category: "Contorni",
                    options: [{ name: "Verdure", amount: null, unit: null, position: 0 }],
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
                    category: "Contorni",
                    options: [{ name: "Insalata", amount: null, unit: null, position: 0 }],
                  },
                ],
              },
            ],
          },
        ],
      },
      { multiSelect: new Set(["Primi"]) },
    );

    const options = screen.getByRole("button", { name: en.labels.PLAN_OPTIONS });
    expect(options.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("heading", { name: en.labels.ALLOW_MULTIPLE_CHOICES })).toBeNull();

    fireEvent.click(options);

    expect(options.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByRole("heading", { level: 3, name: en.labels.ALLOW_MULTIPLE_CHOICES }),
    ).toBeTruthy();
    const switches = screen.getAllByRole<HTMLInputElement>("switch");
    expect(switches.map((input) => input.getAttribute("aria-label"))).toEqual([
      "Multiple, Contorni",
      "Multiple, Primi",
    ]);
    expect(switches[0]?.checked).toBe(false);
    expect(switches[1]?.checked).toBe(true);
    expect(switches[1]?.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(switches[0]!);
    expect(onMultiSelectChange).toHaveBeenCalledWith("Contorni", true);

    fireEvent.change(screen.getByLabelText("Day"), { target: { value: "1" } });
    expect(options.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("switch")).toHaveLength(2);

    fireEvent.click(options);
    expect(options.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("names the switch with the visible word in the current locale", () => {
    setLocale("it");

    renderPlan();

    fireEvent.click(screen.getByRole("button", { name: italian.labels.PLAN_OPTIONS }));

    expect(
      screen.getByRole("switch", { name: `${italian.labels.MULTIPLE}, Bevande` }),
    ).toBeTruthy();
  });

  it("omits the preference section when the plan has no categories", () => {
    renderPlan({
      days: [{ day: "Lunedì", meals: [{ meal: "Pranzo", categories: [] }] }],
    });

    expect(screen.queryByRole("button", { name: en.labels.PLAN_OPTIONS })).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
  });
});
