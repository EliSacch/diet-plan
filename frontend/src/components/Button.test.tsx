import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Button from "./Button";

describe("Button", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a primary button", () => {
    render(<Button>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button.className).toBe("btn btn-primary");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-busy")).toBe("false");
    expect(button.querySelector(".btn-spinner")).toBeNull();
  });

  it("renders a secondary loading button", () => {
    render(
      <Button variant="secondary" loading type="submit">
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    expect(button.className).toBe("btn btn-secondary");
    expect(button.getAttribute("type")).toBe("submit");
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.querySelector(".btn-spinner")).toBeTruthy();
  });

  it("can be disabled and keep an extra class", () => {
    render(
      <Button className="extra" disabled>
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    expect(button.className).toBe("btn btn-primary extra");
    expect(button.hasAttribute("disabled")).toBe(true);
  });
});
