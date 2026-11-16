import { useEffect, useEffectEvent } from "react";

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
  const dismissAfterTimeout = useEffectEvent(onDismiss);

  useEffect(() => {
    const timer = window.setTimeout(() => dismissAfterTimeout(), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="toast" data-variant={variant} role={variant === "error" ? "alert" : undefined}>
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
      <button type="button" className="toast-dismiss" aria-label={t("DISMISS")} onClick={onDismiss}>
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
