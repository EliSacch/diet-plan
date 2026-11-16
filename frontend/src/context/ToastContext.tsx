import { createContext, type ReactNode, useCallback, useRef, useState } from "react";

import { t } from "../i18n";

import Toast, { type ToastVariant } from "../components/Toast";

export type ToastOptions = { message: string; variant?: ToastVariant };

type ToastItem = { id: number; message: string; variant: ToastVariant };

// oxlint-disable-next-line react/only-export-components -- provider and context stay in this file
export const ToastContext = createContext<((toast: ToastOptions) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback(({ message, variant = "success" }: ToastOptions) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) => [...current, { id, message, variant }]);
  }, []);

  function dismiss(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <section className="toast-viewport" aria-label={t("NOTIFICATIONS")} aria-live="polite">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            variant={toast.variant}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </section>
    </ToastContext.Provider>
  );
}
