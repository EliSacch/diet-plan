import type { ReactNode } from "react";

import { useDocumentTitle } from "../hooks/useDocumentTitle";

import NavBar from "../components/NavBar";

import "./PageLayout.css";

export default function PageLayout({ title, children }: { title: string; children: ReactNode }) {
  useDocumentTitle(title);

  return (
    <div className="page-layout">
      <NavBar />
      <div className="page-layout-content">
        <main>
          <h1 className="page-title">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}
