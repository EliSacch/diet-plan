import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../../api/client";
import { setLocale } from "../../i18n";
import { axiosFailure, axiosResponse, deferred } from "../../test/http";
import type { PlanDocument } from "../../types/diet-plan";
import UploadDietPlan, { MAX_FILE_BYTES } from "./UploadDietPlan";

import { en } from "../../i18n/locales/en";

import type { AxiosRequestConfig, AxiosResponse } from "axios";

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

const pdf = new File(["plan"], "plan.pdf", { type: "application/pdf" });

function fileList(...files: File[]) {
  return Object.assign(Object.fromEntries(files.entries()), {
    length: files.length,
    item: (index: number) => files[index] ?? null,
  }) as unknown as FileList;
}

function renderUpload() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<UploadDietPlan />, { wrapper: Wrapper });
}

function withoutActivePlan() {
  return vi.spyOn(api, "get").mockRejectedValueOnce(axiosFailure(404, { code: "NOT_FOUND" }));
}

function fileInput() {
  const input = screen.getByLabelText(en.labels.UPLOAD_DIET_PLAN);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Missing file input");
  }
  return input;
}

function chooseFile(files: FileList | null) {
  const input = fileInput();
  let current = files;
  Object.defineProperty(input, "files", {
    configurable: true,
    get: () => current,
  });
  Object.defineProperty(input, "value", {
    configurable: true,
    get: () => "",
    set: (next: string) => {
      if (next === "") {
        current = fileList();
      }
    },
  });
  fireEvent.change(input);
}

function dropzone() {
  const zone = document.querySelector(".upload-dropzone");
  if (zone === null) {
    throw new Error("Missing dropzone");
  }
  return zone;
}

describe("UploadDietPlan", () => {
  beforeEach(() => {
    setLocale("en");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows the accepted format and max size", () => {
    withoutActivePlan();
    renderUpload();

    expect(screen.getByText(en.labels.UPLOAD_FORMAT_HINT)).toBeTruthy();
    expect(fileInput().accept).toBe("application/pdf,.pdf");
    expect(fileInput().multiple).toBe(false);
  });

  it("opens the file picker from the choose file button", () => {
    withoutActivePlan();
    renderUpload();
    const click = vi.spyOn(fileInput(), "click");

    fireEvent.click(screen.getByRole("button", { name: en.labels.CHOOSE_FILE }));

    expect(click).toHaveBeenCalled();
  });

  it("waits for confirmation, shows progress, then loads the active plan", async () => {
    const get = withoutActivePlan().mockResolvedValue(axiosResponse(plan));
    const posted = deferred<AxiosResponse>();
    let config: AxiosRequestConfig | undefined;
    const post = vi.spyOn(api, "post").mockImplementation((_url, _body, options) => {
      config = options;
      return posted.promise;
    });
    renderUpload();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

    chooseFile(fileList(pdf));

    expect(screen.getByText("plan.pdf")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(en.labels.READY_TO_UPLOAD);
    expect(screen.queryByText(en.labels.REPLACE_DIET_PLAN_WARNING)).toBeNull();
    expect(post).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: en.labels.UPLOAD_DIET_PLAN }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(fileInput().disabled).toBe(true);
    const body = post.mock.calls[0]?.[1] as FormData;
    expect(body.get("file")).toBe(pdf);

    act(() => {
      config?.onUploadProgress?.({ loaded: 40, total: 100, bytes: 40, lengthComputable: true });
    });
    expect(screen.getByRole("status").textContent).toBe(`40% ${en.labels.UPLOADED}`);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("40");

    act(() => {
      config?.onUploadProgress?.({ loaded: 100, total: 100, bytes: 60, lengthComputable: true });
    });
    expect(screen.getByRole("status").textContent).toBe(en.labels.READING_YOUR_DIET_PLAN);
    expect(screen.getByRole("button", { name: en.labels.CANCEL })).toHaveProperty("disabled", true);
    expect(get).toHaveBeenCalledTimes(1);

    posted.resolve(axiosResponse(plan));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe(en.labels.UPLOAD_COMPLETED),
    );
    expect(get).toHaveBeenCalledTimes(2);
    expect(post.mock.invocationCallOrder[0]).toBeLessThan(get.mock.invocationCallOrder[1]);
    expect(screen.queryByRole("button", { name: en.labels.CANCEL })).toBeNull();
    expect(fileInput().disabled).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("asks to replace the plan when one is already active", async () => {
    vi.spyOn(api, "get").mockResolvedValue(axiosResponse(plan));
    renderUpload();

    chooseFile(fileList(pdf));

    expect(await screen.findByText(en.labels.REPLACE_DIET_PLAN_WARNING)).toBeTruthy();
    expect(screen.getByRole("button", { name: en.labels.REPLACE_DIET_PLAN })).toBeTruthy();
  });

  it("clears the selection on cancel before confirming", () => {
    withoutActivePlan();
    const post = vi.spyOn(api, "post");
    renderUpload();

    chooseFile(fileList(pdf));
    fireEvent.click(screen.getByRole("button", { name: en.labels.CANCEL }));

    expect(screen.queryByText("plan.pdf")).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  it("aborts the request on cancel while the file is uploading", async () => {
    withoutActivePlan();
    let signal: AbortSignal | undefined;
    const post = vi.spyOn(api, "post").mockImplementation((_url, _body, options) => {
      signal = options?.signal as AbortSignal;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new Error("canceled")));
      });
    });
    renderUpload();

    chooseFile(fileList(pdf));
    fireEvent.click(screen.getByRole("button", { name: en.labels.UPLOAD_DIET_PLAN }));
    await waitFor(() => expect(post).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: en.labels.CANCEL }));

    expect(signal?.aborted).toBe(true);
    expect(screen.queryByText("plan.pdf")).toBeNull();
    await waitFor(() => expect(fileInput().disabled).toBe(false));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the catalog message when the upload fails", async () => {
    const get = withoutActivePlan();
    vi.spyOn(api, "post").mockRejectedValue(axiosFailure(422, { code: "VALIDATION_ERROR" }));
    renderUpload();

    chooseFile(fileList(pdf));
    fireEvent.click(screen.getByRole("button", { name: en.labels.UPLOAD_DIET_PLAN }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      en.errors.VALIDATION_ERROR,
    );
    expect(get).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: en.labels.UPLOAD_DIET_PLAN })).toBeTruthy();
  });

  it("rejects files that are not PDFs or are too large", () => {
    withoutActivePlan();
    renderUpload();

    chooseFile(fileList(new File(["notes"], "notes.txt", { type: "text/plain" })));
    expect(screen.getByRole("alert").textContent).toBe(en.labels.FILE_NOT_PDF);
    expect(screen.queryByText("notes.txt")).toBeNull();

    const large = new File([new Uint8Array(MAX_FILE_BYTES + 1)], "big.pdf", {
      type: "application/pdf",
    });
    chooseFile(fileList(large));
    expect(screen.getByRole("alert").textContent).toBe(en.labels.FILE_TOO_LARGE);
    expect(screen.queryByText("big.pdf")).toBeNull();
  });

  it("accepts a single dropped file and rejects several", () => {
    withoutActivePlan();
    renderUpload();

    fireEvent.dragOver(dropzone(), { dataTransfer: { files: fileList(pdf) } });
    expect(dropzone().getAttribute("data-dragging")).toBe("true");

    fireEvent.drop(dropzone(), { dataTransfer: { files: fileList(pdf, pdf) } });
    expect(dropzone().getAttribute("data-dragging")).toBe("false");
    expect(screen.getByRole("alert").textContent).toBe(en.labels.ONLY_ONE_FILE);
    expect(screen.queryByText("plan.pdf")).toBeNull();

    fireEvent.drop(dropzone(), { dataTransfer: { files: fileList(pdf) } });
    expect(screen.getByText("plan.pdf")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the drag highlight while moving over children and clears it on leave", () => {
    withoutActivePlan();
    renderUpload();
    const choose = screen.getByRole("button", { name: en.labels.CHOOSE_FILE });

    function dragLeaveTo(target: Element) {
      fireEvent(dropzone(), new MouseEvent("dragleave", { bubbles: true, relatedTarget: target }));
    }

    fireEvent.dragOver(dropzone());
    dragLeaveTo(choose);
    expect(dropzone().getAttribute("data-dragging")).toBe("true");

    dragLeaveTo(document.body);
    expect(dropzone().getAttribute("data-dragging")).toBe("false");
  });

  it("ignores a drop without files", () => {
    withoutActivePlan();
    renderUpload();

    fireEvent.drop(dropzone(), { dataTransfer: { files: fileList() } });

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("ignores drags, drops and repeated submits while uploading", async () => {
    withoutActivePlan();
    const post = vi.spyOn(api, "post").mockReturnValue(deferred<AxiosResponse>().promise);
    renderUpload();
    const other = new File(["other"], "other.pdf", { type: "application/pdf" });

    chooseFile(fileList(pdf));
    fireEvent.click(screen.getByRole("button", { name: en.labels.UPLOAD_DIET_PLAN }));
    await waitFor(() => expect(fileInput().disabled).toBe(true));

    fireEvent.dragOver(dropzone());
    expect(dropzone().getAttribute("data-dragging")).toBe("false");

    fireEvent.drop(dropzone(), { dataTransfer: { files: fileList(other) } });
    expect(screen.queryByText("other.pdf")).toBeNull();
    expect(screen.getByText("plan.pdf")).toBeTruthy();

    fireEvent.submit(dropzone().closest("form")!);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("does not submit without a selected file", () => {
    withoutActivePlan();
    const post = vi.spyOn(api, "post");
    renderUpload();

    fireEvent.submit(dropzone().closest("form")!);

    expect(post).not.toHaveBeenCalled();
  });

  it("shows sizes in KB below 1 MB and in MB at the limit", () => {
    withoutActivePlan();
    renderUpload();

    chooseFile(fileList(pdf));
    expect(screen.getByText(/^1 KB ·/)).toBeTruthy();

    const atLimit = new File([new Uint8Array(MAX_FILE_BYTES)], "limit.pdf", {
      type: "application/pdf",
    });
    chooseFile(fileList(atLimit));
    expect(screen.getByText(/^1\.0 MB ·/)).toBeTruthy();
  });

  it("ignores an empty file selection", () => {
    withoutActivePlan();
    renderUpload();

    chooseFile(fileList());
    chooseFile(null);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
