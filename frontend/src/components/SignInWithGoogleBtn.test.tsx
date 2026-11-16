import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import SignInWithGoogleBtn from "./SignInWithGoogleBtn";

describe("SignInWithGoogleBtn", () => {
  beforeEach(() => {
    setLocale("en");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("links to Google sign-in", () => {
    render(<SignInWithGoogleBtn />);

    const link = screen.getByRole("link", { name: "Sign in with Google" });
    expect(link.getAttribute("href")).toBe("/auth/google");
  });

  it("shows a loading state and continues to Google after it is pressed", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    render(<SignInWithGoogleBtn />);

    fireEvent.click(screen.getByRole("link", { name: "Sign in with Google" }));

    const link = screen.getByRole("link", { name: "Signing in…" });
    expect(link.getAttribute("aria-busy")).toBe("true");
    expect(link.querySelector(".continue-spinner")).toBeTruthy();
    expect(assign).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/google$/));
  });

  it.each([
    { button: 1 },
    { metaKey: true },
    { ctrlKey: true },
    { shiftKey: true },
    { altKey: true },
  ])("leaves %o clicks to the browser", (init) => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    render(<SignInWithGoogleBtn />);
    const link = screen.getByRole("link", { name: "Sign in with Google" });

    const notCanceled = fireEvent.click(link, init);

    expect(notCanceled).toBe(true);
    expect(link.getAttribute("aria-busy")).toBe("false");
    expect(assign).not.toHaveBeenCalled();
  });

  it("navigates only once when pressed repeatedly", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    render(<SignInWithGoogleBtn />);

    fireEvent.click(screen.getByRole("link", { name: "Sign in with Google" }));
    fireEvent.click(screen.getByRole("link", { name: "Signing in…" }));

    expect(assign).toHaveBeenCalledTimes(1);
  });

  it("clears the loading state when the page is restored", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    render(<SignInWithGoogleBtn />);

    fireEvent.click(screen.getByRole("link", { name: "Sign in with Google" }));
    act(() => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });

    const link = screen.getByRole("link", { name: "Sign in with Google" });
    expect(link.getAttribute("aria-busy")).toBe("false");
    expect(link.querySelector(".continue-spinner")).toBeNull();
  });

  it("keeps the loading state on a page show that is not a restore", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    render(<SignInWithGoogleBtn />);

    fireEvent.click(screen.getByRole("link", { name: "Sign in with Google" }));
    act(() => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: false }));
    });

    expect(screen.getByRole("link", { name: "Signing in…" }).getAttribute("aria-busy")).toBe(
      "true",
    );
  });
});
