import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import ServerError from "./ServerError";

import { en } from "../i18n/locales/en";
import { it as italian } from "../i18n/locales/it";

function renderServerError(onRetry = vi.fn()) {
  render(
    <MemoryRouter initialEntries={["/broken"]}>
      <Routes>
        <Route path="/broken" element={<ServerError onRetry={onRetry} />} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return onRetry;
}

describe("ServerError", () => {
  beforeEach(() => {
    setLocale("en");
  });

  afterEach(() => {
    cleanup();
  });

  it("retries in place and can return home", () => {
    const onRetry = renderServerError();

    expect(screen.getByText("500")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: en.labels.SOMETHING_WENT_WRONG, level: 1 }),
    ).toBeTruthy();
    expect(screen.getByText(en.labels.SOMETHING_WENT_WRONG_MESSAGE)).toBeTruthy();
    expect(document.title).toBe(`${en.labels.SOMETHING_WENT_WRONG} · Diet Plan`);

    fireEvent.click(screen.getByRole("button", { name: en.labels.TRY_AGAIN }));
    expect(onRetry).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: en.labels.GO_HOME }));
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Home page")).toBeTruthy();
  });

  it("uses the current locale", () => {
    setLocale("it");
    renderServerError();

    expect(
      screen.getByRole("heading", { name: italian.labels.SOMETHING_WENT_WRONG, level: 1 }),
    ).toBeTruthy();
    expect(screen.getByText(italian.labels.SOMETHING_WENT_WRONG_MESSAGE)).toBeTruthy();
    expect(screen.getByRole("button", { name: italian.labels.TRY_AGAIN })).toBeTruthy();
    expect(screen.getByRole("button", { name: italian.labels.GO_HOME })).toBeTruthy();
  });
});
