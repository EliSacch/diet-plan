import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { axiosFailure, axiosResponse, deferred } from "../test/http";
import type { PlanDocument } from "../types/diet-plan";
import UploadDietPlan from "./UploadDietPlan";

import { en } from "../i18n/locales/en";

import type { AxiosResponse } from "axios";

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

function renderUpload() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<UploadDietPlan />, { wrapper: Wrapper });
}

function fileInput() {
  const input = document.querySelector("input[type=file]");
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Missing file input");
  }
  return input;
}

function chooseFile(files: FileList | null) {
  const input = fileInput();
  Object.defineProperty(input, "files", { configurable: true, value: files });
  fireEvent.change(input);
}

describe("UploadDietPlan", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens the file input from the button", () => {
    renderUpload();
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});

    fireEvent.click(screen.getByRole("button", { name: "Upload diet plan" }));

    expect(click).toHaveBeenCalled();
  });

  it("posts the file and then loads the active plan", async () => {
    const file = new File(["plan"], "plan.pdf", { type: "application/pdf" });
    const posted = deferred<AxiosResponse>();
    const post = vi.spyOn(api, "post").mockReturnValue(posted.promise);
    const get = vi.spyOn(api, "get").mockResolvedValue(axiosResponse(plan));
    renderUpload();

    chooseFile({ 0: file, length: 1, item: () => file } as unknown as FileList);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Upload diet plan" })).toHaveProperty(
        "disabled",
        true,
      );
    });
    expect(get).not.toHaveBeenCalled();

    posted.resolve(axiosResponse(plan));

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(post.mock.invocationCallOrder[0]).toBeLessThan(get.mock.invocationCallOrder[0]);
    expect(post).toHaveBeenCalledWith("/api/diet-plans/upload", expect.any(FormData));
    const body = post.mock.calls[0]?.[1] as FormData;
    expect(body.get("file")).toBe(file);
    expect(get).toHaveBeenCalledWith(
      "/api/diet-plans/active",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByRole("button", { name: "Upload diet plan" })).toHaveProperty(
      "disabled",
      false,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the catalog message when the upload fails", async () => {
    const file = new File(["notes"], "notes.txt", { type: "text/plain" });
    vi.spyOn(api, "post").mockRejectedValue(axiosFailure(422, { code: "VALIDATION_ERROR" }));
    const get = vi.spyOn(api, "get");
    renderUpload();

    chooseFile({ 0: file, length: 1, item: () => file } as unknown as FileList);

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.VALIDATION_ERROR,
    );
    expect(get).not.toHaveBeenCalled();
  });

  it("ignores an empty file selection", () => {
    const post = vi.spyOn(api, "post");
    renderUpload();

    chooseFile({ length: 0, item: () => null } as unknown as FileList);
    chooseFile(null);

    expect(post).not.toHaveBeenCalled();
  });
});
