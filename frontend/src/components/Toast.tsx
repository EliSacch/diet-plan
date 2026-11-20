import { useEffect, useRef } from "react";

import { t } from "../i18n";

import "./Toast.css";

export type ToastVariant = "success" | "error" | "warning" | "info";

export const TOAST_DURATION_MS = 5000;

const icons: Record<ToastVariant, string> = {
  success: "m7.5 12 3 3 6-6",
  error: "M9 9l6 6M15 9l-6 6",
  warning: "M12 8v5M12 16.5v.01",
  info: "M12 11v5M12 7.5v.01",
};

type ToastProps = {
  message: string;
  variant: ToastVariant;
  onDismiss: () => void;
};

export default function Toast({ message, variant, onDismiss }: ToastProps) {
  const onDismissRef = useRef(onDismiss);
  const remaining = useRef(TOAST_DURATION_MS);
  const startedAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const holds = useRef(0);
  const persistent = variant === "error";

  function clearTimer() {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  }

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  function arm() {
    clearTimer();
    startedAt.current = Date.now();
    timer.current = window.setTimeout(() => onDismissRef.current(), remaining.current);
  }

  useEffect(() => {
    if (persistent) {
      return;
    }
    arm();
    return clearTimer;
  }, [persistent]);

  function hold() {
    if (persistent) {
      return;
    }
    holds.current += 1;
    if (holds.current !== 1 || timer.current === undefined) {
      return;
    }
    remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    clearTimer();
  }

  function release() {
    if (persistent) {
      return;
    }
    holds.current = Math.max(0, holds.current - 1);
    if (holds.current === 0) {
      arm();
    }
  }

  return (
    <div
      className="toast"
      data-variant={variant}
      onPointerEnter={hold}
      onPointerLeave={release}
      onFocus={hold}
      onBlur={release}
    >
      <svg
        className="toast-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d={icons[variant]} />
      </svg>
      <p>{message}</p>
      <button
        type="button"
        className="toast-dismiss"
        aria-label={`${t("DISMISS")}: ${message}`}
        onClick={onDismiss}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
