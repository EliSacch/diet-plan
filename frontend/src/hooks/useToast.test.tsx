import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useToast } from "./useToast";

describe("useToast", () => {
  it("throws when useToast is used outside ToastProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useToast())).toThrow(
      "useToast must be used within ToastProvider",
    );
  });
});
