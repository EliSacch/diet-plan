import type { ReactNode } from "react";

import NavBar from "../components/NavBar";

import "./PageLayout.css";

export default function PageLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="page-layout">
      <NavBar />
      <div className="page-layout-content">
        <h1>{title}</h1>
        <main>{children}</main>
      </div>
    </div>
  );
}
