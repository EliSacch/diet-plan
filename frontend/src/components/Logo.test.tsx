import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Logo from "./Logo";

describe("Logo", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the Diet Plan heading", () => {
    render(<Logo />);

    expect(screen.getByRole("heading", { name: "DietPlan", level: 1 })).toBeTruthy();
  });

  it("renders the wordmark without a heading when the page already has one", () => {
    render(<Logo heading={false} />);

    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByText("Diet")).toBeTruthy();
    expect(screen.getByText("Plan")).toBeTruthy();
  });
});
