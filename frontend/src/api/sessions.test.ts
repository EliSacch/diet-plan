import { describe, expect, it, vi } from "vitest";

import { axiosResponse } from "../test/http";
import type { SessionList } from "../types/session";
import { api } from "./client";
import { listSessions, revokeAllSessions, revokeOtherSessions, revokeSession } from "./sessions";

const sessions: SessionList = {
  sessions: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      is_current: true,
      device: "Chrome on macOS",
      location: "Local network",
      created_at: "2026-03-01T10:00:00.000Z",
      last_seen_at: "2026-03-15T09:05:00.000Z",
    },
  ],
};

describe("listSessions", () => {
  it("requests /api/sessions with the abort signal", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue(axiosResponse(sessions));
    const signal = AbortSignal.timeout(1_000);

    await expect(listSessions(signal)).resolves.toEqual(sessions);
    expect(get).toHaveBeenCalledWith("/api/sessions", { signal });
  });
});

describe("revokeSession", () => {
  it("deletes the session by id", async () => {
    const remove = vi.spyOn(api, "delete").mockResolvedValue(axiosResponse(""));

    await expect(revokeSession(sessions.sessions[0].id)).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith(`/api/sessions/${sessions.sessions[0].id}`);
  });
});

describe("revokeOtherSessions", () => {
  it("posts to revoke-others", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue(axiosResponse(""));

    await expect(revokeOtherSessions()).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith("/api/sessions/revoke-others");
  });
});

describe("revokeAllSessions", () => {
  it("posts to revoke-all", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue(axiosResponse(""));

    await expect(revokeAllSessions()).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith("/api/sessions/revoke-all");
  });
});
