import { describe, expect, it, vi } from "vitest";

import { axiosResponse } from "../test/http";
import type { PlanDocument } from "../types/diet-plan";
import type { Week } from "../types/week";
import { api } from "./client";
import { getWeek, getWeekOptions, saveWeek } from "./weeks";

const pasta = {
  day: "Lunedì",
  meal: "Pranzo",
  category: "Primi",
  name: "Pasta",
  amount: 80,
  unit: "g",
};

const week: Week = { week_start: "2026-11-16", choices: [pasta] };

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
              options: [{ name: "Pasta", amount: 80, unit: "g", position: 0 }],
            },
          ],
        },
      ],
    },
  ],
};

describe("getWeek", () => {
  it("requests the week with the abort signal", async () => {
    const signal = new AbortController().signal;
    const get = vi.spyOn(api, "get").mockResolvedValue(axiosResponse(week));

    await expect(getWeek("2026-11-16", signal)).resolves.toEqual(week);
    expect(get).toHaveBeenCalledWith("/api/weeks/2026-11-16", { signal });
  });
});

describe("getWeekOptions", () => {
  it("requests the week's options with the abort signal", async () => {
    const signal = new AbortController().signal;
    const get = vi.spyOn(api, "get").mockResolvedValue(axiosResponse(plan));

    await expect(getWeekOptions("2026-11-16", signal)).resolves.toEqual(plan);
    expect(get).toHaveBeenCalledWith("/api/weeks/2026-11-16/options", { signal });
  });
});

describe("saveWeek", () => {
  it("puts the choices and returns the saved week", async () => {
    const put = vi.spyOn(api, "put").mockResolvedValue(axiosResponse(week));

    await expect(saveWeek("2026-11-16", [pasta])).resolves.toEqual(week);
    expect(put).toHaveBeenCalledWith("/api/weeks/2026-11-16", { choices: [pasta] });
  });
});
