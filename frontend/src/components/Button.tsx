import { type ButtonHTMLAttributes, type ReactNode } from "react";

import "./Button.css";

type ButtonProps = {
  variant?: "primary" | "secondary" | "danger" | "danger-secondary";
  loading?: boolean;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export default function Button({
  variant = "primary",
  loading = false,
  className,
  children,
  type = "button",
  disabled = false,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={className ? `btn btn-${variant} ${className}` : `btn btn-${variant}`}
      {...props}
      disabled={loading || disabled}
      aria-busy={loading}
    >
      <span className="btn-label">{children}</span>
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : null}
    </button>
  );
}
