import {
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useId,
  useRef,
} from "react";

import Button from "./Button";

import "./ConfirmModal.css";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = dialogRef.current as HTMLDialogElement;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onCancel();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="confirm-modal"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className="confirm-modal-content">
        <h2 id={titleId}>{title}</h2>
        <div id={messageId} className="confirm-modal-message">
          {children}
        </div>
        <div className="confirm-modal-actions">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  );
}
