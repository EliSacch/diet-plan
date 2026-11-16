import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { messageForProblem, setLocale, t } from "./index";

import { en } from "./locales/en";
import { it as italian } from "./locales/it";

describe("messageForProblem", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("returns the catalog message for a known code", () => {
    expect(messageForProblem({ code: "NOT_FOUND", detail: "Item not found" })).toBe(
      en.errors.NOT_FOUND,
    );
  });

  it("returns detail when the code is not in the catalog", () => {
    expect(messageForProblem({ code: "ITEM_NOT_FOUND", detail: "Item 42 not found" })).toBe(
      "Item 42 not found",
    );
  });

  it("returns the unknown message when code and detail are missing", () => {
    expect(messageForProblem({})).toBe(en.errors.UNKNOWN);
  });

  it("returns the Italian message after setLocale", () => {
    setLocale("it");
    expect(messageForProblem({ code: "NOT_FOUND" })).toBe(italian.errors.NOT_FOUND);
    setLocale("en");
  });

  it("keeps the current locale when setLocale is given an unknown language", () => {
    setLocale("it");
    setLocale("fr");
    expect(messageForProblem({ code: "NOT_FOUND" })).toBe(italian.errors.NOT_FOUND);
  });
});

describe("t", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("returns the label for the current locale", () => {
    expect(t("UPLOAD_DIET_PLAN")).toBe(en.labels.UPLOAD_DIET_PLAN);
    setLocale("it");
    expect(t("UPLOAD_DIET_PLAN")).toBe(italian.labels.UPLOAD_DIET_PLAN);
  });
});

describe("localeFromBrowser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("falls back to English when the browser language is not supported", async () => {
    vi.resetModules();
    vi.stubGlobal("navigator", { languages: [], language: "fr-FR" });

    const { messageForProblem: message } = await import("./index");

    expect(message({ code: "NOT_FOUND" })).toBe(en.errors.NOT_FOUND);
  });
});
