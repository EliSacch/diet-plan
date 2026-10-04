import { describe, expect, it } from "vitest";

import { api } from "./client";

describe("api", () => {
  it("sends the session cookie on API requests", () => {
    expect(api.defaults.withCredentials).toBe(true);
  });
});
