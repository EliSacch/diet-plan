import { Link } from "react-router-dom";

import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { t } from "../i18n";
import ErrorPage from "./ErrorPage";

export default function NotFound() {
  useDocumentTitle(t("PAGE_NOT_FOUND"));

  return (
    <ErrorPage
      code="404"
      title={t("PAGE_NOT_FOUND")}
      message={t("PAGE_NOT_FOUND_MESSAGE")}
      actions={
        <Link to="/" className="btn btn-primary">
          {t("GO_HOME")}
        </Link>
      }
    />
  );
}
