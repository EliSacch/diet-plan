import type { ReactNode } from "react";

import NavBar from "../components/NavBar";

import "./PageLayout.css";

export default function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-layout">
      <NavBar />
      <div className="page-layout-content">
        <main>{children}</main>
      </div>
    </div>
  );
}
