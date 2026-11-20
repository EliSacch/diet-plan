import { describe, expect, it, vi } from "vitest";

import { axiosResponse } from "../test/http";
import type { CustomOption, CustomOptionInput } from "../types/custom-option";
import { api } from "./client";
import { createCustomOption, deleteCustomOption } from "./custom-options";

const farro: CustomOptionInput = {
  meal: "Pranzo",
  category: "Primi",
  name: "Pasta di farro",
  amount: 70,
  unit: "g",
};

describe("createCustomOption", () => {
  it("posts the option and returns the stored one", async () => {
    const stored: CustomOption = { id: 7, ...farro };
    const post = vi.spyOn(api, "post").mockResolvedValue(axiosResponse(stored));

    await expect(createCustomOption(farro)).resolves.toEqual(stored);
    expect(post).toHaveBeenCalledWith("/api/custom-options", farro);
  });
});

describe("deleteCustomOption", () => {
  it("deletes the option by id", async () => {
    const remove = vi.spyOn(api, "delete").mockResolvedValue(axiosResponse(""));

    await expect(deleteCustomOption(7)).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith("/api/custom-options/7");
  });
});
