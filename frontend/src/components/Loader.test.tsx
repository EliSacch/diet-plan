import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loader from "./Loader";

describe("Loader", () => {
  it("exposes its label to assistive technology", () => {
    render(<Loader label="Checking your session…" />);

    expect(screen.getByRole("status", { name: "Checking your session…" })).toBeTruthy();
  });
});
