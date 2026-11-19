import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import type { DayChoice } from "../types/day";
import type { PlanDay } from "../types/diet-plan";
import DailyChoices from "./DailyChoices";

import { en } from "../i18n/locales/en";
import { it as italian } from "../i18n/locales/it";

const monday: PlanDay = {
  day: "Lunedì",
  meals: [
    {
      meal: "Colazione",
      categories: [
        {
          category: "Bevande",
          options: [{ name: "Latte", amount: 200, unit: "ml", position: 0 }],
        },
        {
          category: "Cereali",
          options: [{ name: "Fette biscottate", amount: 4, unit: null, position: 0 }],
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
          options: [{ name: "Insalata mista", amount: null, unit: null, position: 0 }],
        },
      ],
    },
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

function renderChoices(choices: DayChoice[], { day = monday, onPlan = vi.fn() } = {}) {
  return { onPlan, ...render(<DailyChoices day={day} choices={choices} onPlan={onPlan} />) };
}

describe("DailyChoices", () => {
  afterEach(() => {
    cleanup();
    setLocale("en");
  });

  it("shows picked options without categories, in plan order, and omits empty meals", () => {
    const { onPlan } = renderChoices([
      {
        meal: "Pranzo",
        category: "Contorni",
        name: "Insalata mista",
        amount: null,
        unit: null,
      },
      {
        meal: "Pranzo",
        category: "Primi",
        name: "Pasta",
        amount: 80,
        unit: "g",
      },
      {
        meal: "Colazione",
        category: "Cereali",
        name: "Fette biscottate",
        amount: 4,
        unit: null,
      },
    ]);

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Colazione",
      "Pranzo",
    ]);
    expect(screen.queryByRole("heading", { level: 2, name: "Cena" })).toBeNull();
    expect(screen.queryByText("Bevande")).toBeNull();
    expect(screen.queryByText("Cereali")).toBeNull();
    expect(screen.queryByText("Primi")).toBeNull();
    expect(screen.queryByText("Contorni")).toBeNull();

    const items = screen.getAllByRole("listitem").map((el) => el.textContent);
    expect(items).toEqual(["Fette biscottate 4", "Pasta 80 g", "Insalata mista"]);
    expect(document.querySelector(".daily-choices-illustration")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: en.labels.EDIT }));
    expect(onPlan).toHaveBeenCalledOnce();
  });

  it("keeps saved picks whose category or meal is no longer in the active plan", () => {
    renderChoices([
      {
        meal: "Pranzo",
        category: "Dolci",
        name: "Yogurt",
        amount: 125,
        unit: "g",
      },
      {
        meal: "Spuntino",
        category: "Frutta",
        name: "Mela",
        amount: 150,
        unit: "g",
      },
      {
        meal: "Spuntino",
        category: "Frutta secca",
        name: "Mandorle",
        amount: 20,
        unit: "g",
      },
    ]);

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Pranzo",
      "Spuntino",
    ]);
    expect(screen.getByText("Yogurt 125 g")).toBeTruthy();
    expect(screen.getByText("Mela 150 g")).toBeTruthy();
    expect(screen.getByText("Mandorle 20 g")).toBeTruthy();
  });

  it("shows an empty state button when nothing is picked for the day", () => {
    const { onPlan } = renderChoices([]);

    const message = screen.getByText(en.labels.NO_CHOICES_FOR_DAY);
    const illustration = document.querySelector<HTMLImageElement>(".daily-choices-illustration");
    const button = screen.getByRole("button", { name: en.labels.PLAN_THIS_DAY });

    expect(illustration).toBeTruthy();
    expect(illustration?.getAttribute("alt")).toBe("");
    expect(screen.queryByRole("img")).toBeNull();
    expect(message.compareDocumentPosition(illustration as HTMLImageElement)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect((illustration as HTMLImageElement).compareDocumentPosition(button)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.queryByRole("button", { name: en.labels.EDIT })).toBeNull();

    fireEvent.click(button);
    expect(onPlan).toHaveBeenCalledOnce();
  });

  it("uses the current locale for the empty state and edit button", () => {
    setLocale("it");
    renderChoices([]);

    expect(screen.getByText(italian.labels.NO_CHOICES_FOR_DAY)).toBeTruthy();
    expect(screen.getByRole("button", { name: italian.labels.PLAN_THIS_DAY })).toBeTruthy();

    cleanup();
    renderChoices([
      {
        meal: "Pranzo",
        category: "Primi",
        name: "Pasta",
        amount: 80,
        unit: "g",
      },
    ]);

    expect(screen.getByRole("button", { name: italian.labels.EDIT })).toBeTruthy();
  });
});
