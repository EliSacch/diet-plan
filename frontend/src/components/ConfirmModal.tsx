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

type ConfirmModalVariant = "primary" | "danger";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  variant?: ConfirmModalVariant;
  onConfirm: () => void;
  onCancel: () => void;
};

const buttonVariants = {
  primary: { confirm: "primary", cancel: "secondary" },
  danger: { confirm: "danger", cancel: "danger-secondary" },
} as const;

export default function ConfirmModal({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  variant = "primary",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();
  const buttons = buttonVariants[variant];

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
    // Backdrop click is a pointer shortcut. Escape cancels through onCancel.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
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
          <Button variant={buttons.cancel} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={buttons.confirm} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
