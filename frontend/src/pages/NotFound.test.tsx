import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { setLocale } from "../i18n";
import { axiosFailure } from "../test/http";
import NotFound from "./NotFound";

import App from "../App";

import { en } from "../i18n/locales/en";
import { it as italian } from "../i18n/locales/it";

describe("NotFound", () => {
  beforeEach(() => {
    setLocale("en");
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("shows a way home for an unknown path", async () => {
    window.history.pushState({}, "", "/missing-page");
    vi.spyOn(api, "get").mockRejectedValue(axiosFailure(401, { code: "UNAUTHORIZED" }));

    render(<App />);

    expect(screen.getByText("404")).toBeTruthy();
    expect(screen.getByRole("heading", { name: en.labels.PAGE_NOT_FOUND, level: 2 })).toBeTruthy();
    expect(screen.getByText(en.labels.PAGE_NOT_FOUND_MESSAGE)).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: en.labels.GO_HOME }));

    expect(await screen.findByRole("link", { name: en.labels.SIGN_IN_WITH_GOOGLE })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: en.labels.PAGE_NOT_FOUND })).toBeNull();
  });

  it("uses the current locale", () => {
    setLocale("it");

    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: italian.labels.PAGE_NOT_FOUND, level: 2 }),
    ).toBeTruthy();
    expect(screen.getByText(italian.labels.PAGE_NOT_FOUND_MESSAGE)).toBeTruthy();
    expect(screen.getByRole("link", { name: italian.labels.GO_HOME }).getAttribute("href")).toBe(
      "/",
    );
  });
});
