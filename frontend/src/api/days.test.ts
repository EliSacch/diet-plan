import { describe, expect, it, vi } from "vitest";

import { axiosResponse } from "../test/http";
import type { Day, DayOptions } from "../types/day";
import { api } from "./client";
import { getDay, getDayOptions, saveDay } from "./days";

const pasta = {
  meal: "Pranzo",
  category: "Primi",
  name: "Pasta",
  amount: 80,
  unit: "g",
};

const day: Day = { date: "2026-11-19", choices: [pasta] };

const planDay: DayOptions = {
  day: "Giovedì",
  meals: [
    {
      meal: "Pranzo",
      categories: [
        {
          category: "Primi",
          options: [{ name: "Pasta", amount: 80, unit: "g", position: 0 }],
          custom_options: [{ id: 7, name: "Pasta di farro", amount: 70, unit: "g" }],
          current: { name: "Pasta", amount: 100, unit: "g" },
        },
      ],
    },
  ],
};

describe("getDay", () => {
  it("requests the day with the abort signal", async () => {
    const signal = new AbortController().signal;
    const get = vi.spyOn(api, "get").mockResolvedValue(axiosResponse(day));

    await expect(getDay("2026-11-19", signal)).resolves.toEqual(day);
    expect(get).toHaveBeenCalledWith("/api/days/2026-11-19", { signal });
  });
});

describe("getDayOptions", () => {
  it("requests the day's options with the abort signal", async () => {
    const signal = new AbortController().signal;
    const get = vi.spyOn(api, "get").mockResolvedValue(axiosResponse(planDay));

    await expect(getDayOptions("2026-11-19", signal)).resolves.toEqual(planDay);
    expect(get).toHaveBeenCalledWith("/api/days/2026-11-19/options", { signal });
  });
});

describe("saveDay", () => {
  it("puts the choices and returns the saved day", async () => {
    const put = vi.spyOn(api, "put").mockResolvedValue(axiosResponse(day));

    await expect(saveDay("2026-11-19", [pasta])).resolves.toEqual(day);
    expect(put).toHaveBeenCalledWith("/api/days/2026-11-19", { choices: [pasta] });
  });
});
