import type { ReactNode } from "react";

import "./PageLayout.css";

export default function PageLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="page-layout">
      <h1>{title}</h1>
      <main>{children}</main>
    </div>
  );
}
