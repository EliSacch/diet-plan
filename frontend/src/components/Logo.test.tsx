import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Logo from "./Logo";

describe("Logo", () => {
  it("renders the Diet Plan heading", () => {
    render(<Logo />);

    expect(screen.getByRole("heading", { name: "DietPlan", level: 1 })).toBeTruthy();
  });
});
