import { useContext } from "react";

import { ToastContext } from "../context/ToastContext";

export function useToast() {
  const showToast = useContext(ToastContext);
  if (showToast === null) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return showToast;
}
