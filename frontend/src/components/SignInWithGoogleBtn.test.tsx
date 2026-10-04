import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SignInWithGoogleBtn from "./SignInWithGoogleBtn";

describe("SignInWithGoogleBtn", () => {
  it("links to Google sign-in", () => {
    render(<SignInWithGoogleBtn />);

    const link = screen.getByRole("link", { name: "Sign in with Google" });
    expect(link.getAttribute("href")).toBe("/auth/google");
  });
});
