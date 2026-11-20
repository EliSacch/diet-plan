import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import ErrorBoundary from "./ErrorBoundary";

import { en } from "../i18n/locales/en";

describe("ErrorBoundary", () => {
  beforeEach(() => {
    setLocale("en");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders children until one throws, then recovers", () => {
    let fail = true;

    function Child() {
      if (fail) {
        throw new Error("boom");
      }
      return <p>Recovered</p>;
    }

    const { rerender } = render(
      <MemoryRouter>
        <ErrorBoundary>
          <p>Ready</p>
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(screen.getByText("Ready")).toBeTruthy();

    rerender(
      <MemoryRouter>
        <ErrorBoundary>
          <Child />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: en.labels.SOMETHING_WENT_WRONG, level: 1 }),
    ).toBeTruthy();

    fail = false;
    fireEvent.click(screen.getByRole("button", { name: en.labels.TRY_AGAIN }));

    expect(screen.getByText("Recovered")).toBeTruthy();
  });
});
