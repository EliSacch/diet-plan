import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { describe, expect, it, vi } from "vitest";

import App from "./App";

vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({ render: vi.fn() })),
}));

describe("main", () => {
  it("renders the app into #root", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.replaceChildren(root);

    await import("./main");

    expect(createRoot).toHaveBeenCalledWith(root);
    const element = vi.mocked(createRoot).mock.results[0]?.value.render.mock.calls[0]?.[0];
    expect(element.type).toBe(StrictMode);
    expect(element.props.children.type).toBe(App);
  });
});
