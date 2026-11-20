import type { ReactNode } from "react";

import SessionLayout from "../layouts/SessionLayout";

import "./ErrorPage.css";

type ErrorPageProps = {
  code: string;
  title: string;
  message: string;
  actions: ReactNode;
};

export default function ErrorPage({ code, title, message, actions }: ErrorPageProps) {
  return (
    <SessionLayout>
      <div className="error-page">
        <p className="error-page-code" aria-hidden="true">
          {code}
        </p>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="error-page-actions">{actions}</div>
      </div>
    </SessionLayout>
  );
}
