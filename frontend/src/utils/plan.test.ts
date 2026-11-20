import { describe, expect, it } from "vitest";

import { MAX_AMOUNT, MAX_NAME_LENGTH, optionLabel, parseOptionFields } from "./plan";

describe("optionLabel", () => {
  it.each([
    [{ name: "Pasta", amount: 80, unit: "g" }, "Pasta 80 g"],
    [{ name: "Uova", amount: 2, unit: null }, "Uova 2"],
    [{ name: "Insalata mista", amount: null, unit: "g" }, "Insalata mista"],
  ])("labels %o as %s", (option, label) => {
    expect(optionLabel(option)).toBe(label);
  });
});

describe("parseOptionFields", () => {
  it("trims the name and parses the amount", () => {
    expect(parseOptionFields("  Pasta di farro ", "80.5")).toEqual({
      ok: true,
      name: "Pasta di farro",
      amount: 80.5,
    });
  });

  it("treats a blank amount as no amount", () => {
    expect(parseOptionFields("Insalata", "  ")).toEqual({
      ok: true,
      name: "Insalata",
      amount: null,
    });
  });

  it("accepts the limits", () => {
    expect(parseOptionFields("x".repeat(MAX_NAME_LENGTH), String(MAX_AMOUNT))).toMatchObject({
      ok: true,
    });
  });

  it.each([
    ["", "NAME_REQUIRED"],
    ["   ", "NAME_REQUIRED"],
    ["x".repeat(MAX_NAME_LENGTH + 1), "NAME_TOO_LONG"],
  ])("rejects the name %j", (name, error) => {
    expect(parseOptionFields(name, "80")).toEqual({ ok: false, errors: { name: error } });
  });

  it.each(["0", "-5", String(MAX_AMOUNT + 1), "abc", "Infinity"])(
    "rejects the amount %j",
    (amount) => {
      expect(parseOptionFields("Pasta", amount)).toEqual({
        ok: false,
        errors: { amount: "AMOUNT_INVALID" },
      });
    },
  );

  it("reports both fields at once", () => {
    expect(parseOptionFields("", "0")).toEqual({
      ok: false,
      errors: { name: "NAME_REQUIRED", amount: "AMOUNT_INVALID" },
    });
  });
});
