import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { setLocale } from "../i18n";
import NavBar from "./NavBar";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavBar />
      <Routes>
        <Route path="/" element={<p>Home page</p>} />
        <Route path="/profile" element={<p>Profile page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NavBar", () => {
  afterEach(() => {
    cleanup();
    setLocale("en");
  });

  it("marks only the current page as active", () => {
    renderAt("/profile");

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(nav).getByRole("link", { name: "Profile" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Diet plan" }).getAttribute("aria-current")).toBe(
      null,
    );
  });

  it("navigates between pages", () => {
    renderAt("/");

    fireEvent.click(screen.getByRole("link", { name: "Profile" }));

    expect(screen.getByText("Profile page")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Profile" }).getAttribute("aria-current")).toBe("page");

    fireEvent.click(screen.getByRole("link", { name: "DietPlan" }));

    expect(screen.getByText("Home page")).toBeTruthy();
  });

  it("uses the current locale for the labels", () => {
    setLocale("it");

    renderAt("/");

    expect(screen.getByRole("navigation", { name: "Navigazione principale" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Piano alimentare" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Profilo" })).toBeTruthy();
  });
});
