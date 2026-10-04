import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSessionContext } from "./useSessionContext";

describe("useSessionContext", () => {
  it("throws when useSessionContext is used outside SessionProvider", () => {
    function Probe() {
      useSessionContext();
      return null;
    }

    expect(() => render(<Probe />)).toThrow(
      "useSessionContext must be used within SessionProvider",
    );
  });
});
