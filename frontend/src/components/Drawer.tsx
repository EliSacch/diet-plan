import {
  type MouseEvent,
  type ReactNode,
  type Ref,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
} from "react";

import { t } from "../i18n";

import "./Drawer.css";

type DrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  headerExtras?: ReactNode;
  children: ReactNode;
  bodyRef?: Ref<HTMLDivElement>;
  closeDisabled?: boolean;
};

function OpenDrawer({
  title,
  onClose,
  headerExtras,
  children,
  bodyRef,
  closeDisabled = false,
}: Omit<DrawerProps, "open">) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleEscape = useEffectEvent(onClose);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (closeDisabled) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleEscape();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeDisabled]);

  function onBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (!closeDisabled && event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onBackdropClick}>
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <span className="drawer-handle" aria-hidden="true" />
        <header className="drawer-header">
          <div className="drawer-top">
            <h2 id={titleId}>{title}</h2>
            <button
              ref={closeRef}
              type="button"
              className="drawer-close"
              aria-label={t("CLOSE")}
              onClick={onClose}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          {headerExtras}
        </header>
        <div ref={bodyRef} className="drawer-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Drawer({ open, ...props }: DrawerProps) {
  if (!open) {
    return null;
  }
  return <OpenDrawer {...props} />;
}
