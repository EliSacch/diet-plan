import { type ChangeEvent, type DragEvent, type FormEvent, useRef, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { uploadDietPlan } from "../../api/diet-plan";
import {
  activeDietPlanQueryOptions,
  dietPlanErrorMessage,
  useActiveDietPlan,
} from "../../hooks/useActiveDietPlan";
import { t } from "../../i18n";
import Button from "../buttons/Button";

import "./UploadDietPlan.css";

// Matches MAX_BODY_BYTES in the backend; the multipart envelope also counts towards it.
export const MAX_FILE_BYTES = 1_048_576;

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ plus = false }: { plus?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      {plus ? <path d="M12 11v6M9 14h6" /> : null}
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

export default function UploadDietPlan() {
  const queryClient = useQueryClient();
  const activePlan = useActiveDietPlan();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  const upload = useMutation({
    mutationFn: async (selected: File) => {
      const controller = new AbortController();
      abortRef.current = controller;
      await uploadDietPlan(selected, { signal: controller.signal, onProgress: setProgress });
      return queryClient.fetchQuery(activeDietPlanQueryOptions());
    },
  });

  const busy = upload.isPending;
  const processing = busy && progress >= 1;
  const hasPlan = Boolean(activePlan.data);

  function selectFile(candidate: File) {
    upload.reset();
    setProgress(0);
    if (!isPdf(candidate)) {
      setFile(null);
      setRejection(t("FILE_NOT_PDF"));
    } else if (candidate.size > MAX_FILE_BYTES) {
      setFile(null);
      setRejection(t("FILE_TOO_LARGE"));
    } else {
      setFile(candidate);
      setRejection(null);
    }
  }

  function onChooseFile(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.currentTarget.files?.item(0) ?? null;
    event.currentTarget.value = "";
    if (chosen !== null) {
      selectFile(chosen);
    }
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!busy) {
      setDragging(true);
    }
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragging(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) {
      return;
    }
    const dropped = event.dataTransfer.files;
    if (dropped.length > 1) {
      setRejection(t("ONLY_ONE_FILE"));
      return;
    }
    const first = dropped.item(0);
    if (first !== null) {
      selectFile(first);
    }
  }

  function onCancel() {
    if (busy) {
      abortRef.current?.abort();
    }
    upload.reset();
    setFile(null);
    setProgress(0);
    setRejection(null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (file === null || busy) {
      return;
    }
    setProgress(0);
    upload.mutate(file);
  }

  let status = t("READY_TO_UPLOAD");
  if (upload.isSuccess) {
    status = t("UPLOAD_COMPLETED");
  } else if (processing) {
    status = t("READING_YOUR_DIET_PLAN");
  } else if (busy) {
    status = `${Math.round(progress * 100)}% ${t("UPLOADED")}`;
  }

  const error = rejection ?? (upload.isError ? dietPlanErrorMessage(upload.error) : null);

  return (
    <form className="upload-diet-plan" onSubmit={onSubmit} noValidate>
      <h2>{t("UPLOAD_DIET_PLAN")}</h2>

      <div
        className="upload-dropzone"
        data-dragging={dragging}
        aria-disabled={busy}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <span className="upload-dropzone-icon">
          <FileIcon plus />
        </span>
        <p>
          {t("DRAG_AND_DROP_OR")}{" "}
          <button
            type="button"
            className="upload-choose"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {t("CHOOSE_FILE")}
          </button>
        </p>
        <p className="upload-hint">{t("UPLOAD_FORMAT_HINT")}</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          aria-label={t("UPLOAD_DIET_PLAN")}
          tabIndex={-1}
          disabled={busy}
          onChange={onChooseFile}
        />
      </div>

      {file !== null ? (
        <div className="upload-file" data-complete={upload.isSuccess}>
          <span className="upload-file-icon">
            <FileIcon />
          </span>
          <div className="upload-file-body">
            <p className="upload-file-name">{file.name}</p>
            <p className="upload-file-meta">
              {formatSize(file.size)} · <span role="status">{status}</span>
            </p>
            {busy || upload.isSuccess ? (
              <div
                className="upload-progress"
                role="progressbar"
                aria-label={t("UPLOAD_PROGRESS")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={upload.isSuccess ? 100 : Math.round(progress * 100)}
              >
                <span style={{ width: `${upload.isSuccess ? 100 : progress * 100}%` }} />
              </div>
            ) : null}
          </div>
          {upload.isSuccess ? (
            <span className="upload-file-check">
              <CheckIcon />
            </span>
          ) : null}
        </div>
      ) : null}

      {error !== null ? <p role="alert">{error}</p> : null}

      {file !== null && !upload.isSuccess ? (
        <>
          {hasPlan ? <p className="upload-warning">{t("REPLACE_DIET_PLAN_WARNING")}</p> : null}
          <div className="upload-actions">
            <Button variant="secondary" disabled={processing} onClick={onCancel}>
              {t("CANCEL")}
            </Button>
            <Button type="submit" loading={busy}>
              {hasPlan ? t("REPLACE_DIET_PLAN") : t("UPLOAD_DIET_PLAN")}
            </Button>
          </div>
        </>
      ) : null}
    </form>
  );
}
