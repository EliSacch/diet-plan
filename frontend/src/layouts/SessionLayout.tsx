import type { ReactNode } from "react";

import Logo from "../components/Logo";

import "./SessionLayout.css";

export default function SessionLayout({
  children,
  wordmarkHeading = true,
}: {
  children: ReactNode;
  wordmarkHeading?: boolean;
}) {
  return (
    <main className="session-layout">
      <Logo heading={wordmarkHeading} />
      {children}
    </main>
  );
}
