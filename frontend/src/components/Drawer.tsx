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

function inertOutside(container: HTMLElement) {
  const marked: HTMLElement[] = [];
  let node: HTMLElement | null = container;
  while (node !== null && node !== document.body) {
    const parent: HTMLElement | null = node.parentElement;
    if (parent === null) {
      break;
    }
    for (const sibling of parent.children) {
      if (!(sibling instanceof HTMLElement) || sibling === node) {
        continue;
      }
      // A confirm dialog is a sibling of the drawer and must stay usable.
      if (sibling instanceof HTMLDialogElement || sibling.hasAttribute("inert")) {
        continue;
      }
      sibling.setAttribute("inert", "");
      marked.push(sibling);
    }
    node = parent;
  }
  return marked;
}

function isTabbable(element: HTMLElement, container: HTMLElement) {
  if (element.closest("[hidden]") !== null || element.tabIndex < 0) {
    return false;
  }
  if ("disabled" in element && element.disabled) {
    return false;
  }
  if (element instanceof HTMLInputElement && element.type === "radio" && element.name !== "") {
    const group = [...container.querySelectorAll<HTMLInputElement>("input[type='radio']")].filter(
      (radio) =>
        radio.name === element.name &&
        radio.tabIndex >= 0 &&
        !radio.disabled &&
        radio.closest("[hidden]") === null,
    );
    const checked = group.find((radio) => radio.checked);
    return (checked ?? group[0]) === element;
  }
  return true;
}

function tabbable(container: HTMLElement) {
  const selector = "a[href], button, input, select, textarea, [tabindex]";
  return [...container.querySelectorAll<HTMLElement>(selector)].filter((element) =>
    isTabbable(element, container),
  );
}

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
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleEscape = useEffectEvent(onClose);

  useEffect(() => {
    const backdrop = backdropRef.current as HTMLDivElement;
    const previouslyFocused = document.activeElement;
    const marked = inertOutside(backdrop);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      for (const element of marked) {
        element.removeAttribute("inert");
      }
      document.body.style.overflow = previousOverflow;
      if (
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused !== document.body &&
        previouslyFocused.isConnected
      ) {
        previouslyFocused.focus();
      }
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (closeDisabled) {
          return;
        }
        event.preventDefault();
        handleEscape();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const dialog = dialogRef.current;
      const target = event.target;
      if (dialog === null || !(target instanceof Node) || !dialog.contains(target)) {
        return;
      }
      const focusable = tabbable(dialog);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) {
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
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
    // Backdrop click is a pointer shortcut. Escape and Close cover the keyboard.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div ref={backdropRef} className="drawer-backdrop" onClick={onBackdropClick}>
      <div
        ref={dialogRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
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
