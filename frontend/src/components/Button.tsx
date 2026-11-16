import { type ButtonHTMLAttributes, type ReactNode } from "react";

import "./Button.css";

type ButtonProps = {
  variant?: "primary" | "secondary";
  loading?: boolean;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export default function Button({
  variant = "primary",
  loading = false,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={className ? `btn btn-${variant} ${className}` : `btn btn-${variant}`}
      {...props}
      aria-busy={loading}
    >
      <span className="btn-label">{children}</span>
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : null}
    </button>
  );
}
