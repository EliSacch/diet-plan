import { describe, expect, it, vi } from "vitest";

import { axiosResponse } from "../test/http";
import type { PlanDocument } from "../types/diet-plan";
import { api } from "./client";
import { getActiveDietPlan, uploadDietPlan } from "./diet-plan";

const plan: PlanDocument = {
  days: [
    {
      day: "Lunedì",
      meals: [
        {
          meal: "Colazione",
          categories: [
            {
              category: "Bevande",
              options: [{ name: "Tè", amount: 200, unit: "ml", position: 0 }],
            },
          ],
        },
      ],
    },
  ],
};

describe("getActiveDietPlan", () => {
  it("requests /api/diet-plans/active with the abort signal", async () => {
    const signal = new AbortController().signal;
    const get = vi.spyOn(api, "get").mockResolvedValue(axiosResponse(plan));

    await expect(getActiveDietPlan(signal)).resolves.toEqual(plan);
    expect(get).toHaveBeenCalledWith("/api/diet-plans/active", { signal });
  });
});

describe("uploadDietPlan", () => {
  it("posts the file to /api/diet-plans/upload", async () => {
    const file = new File(["plan"], "plan.pdf", { type: "application/pdf" });
    const post = vi.spyOn(api, "post").mockResolvedValue(axiosResponse(plan));

    await expect(uploadDietPlan(file)).resolves.toEqual(plan);

    expect(post).toHaveBeenCalledWith(
      "/api/diet-plans/upload",
      expect.any(FormData),
      expect.objectContaining({ signal: undefined }),
    );
    const body = post.mock.calls[0]?.[1] as FormData;
    expect(body.get("file")).toBe(file);
  });

  it("passes the signal and reports upload progress as a fraction", async () => {
    const file = new File(["plan"], "plan.pdf", { type: "application/pdf" });
    const signal = new AbortController().signal;
    const onProgress = vi.fn();
    const post = vi.spyOn(api, "post").mockResolvedValue(axiosResponse(plan));

    await uploadDietPlan(file, { signal, onProgress });

    const config = post.mock.calls[0]?.[2];
    expect(config?.signal).toBe(signal);
    config?.onUploadProgress?.({ loaded: 25, total: 100, bytes: 25, lengthComputable: true });
    config?.onUploadProgress?.({
      loaded: 25,
      total: undefined,
      bytes: 25,
      lengthComputable: false,
    });
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(0.25);
  });
});
