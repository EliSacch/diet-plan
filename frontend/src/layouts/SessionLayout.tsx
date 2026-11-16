import type { ReactNode } from "react";

import Logo from "../components/Logo";

import "./SessionLayout.css";

export default function SessionLayout({ children }: { children: ReactNode }) {
  return (
    <main className="session-layout">
      <Logo />
      {children}
    </main>
  );
}
