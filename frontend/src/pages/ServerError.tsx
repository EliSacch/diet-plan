import { useNavigate } from "react-router-dom";

import { t } from "../i18n";
import ErrorPage from "./ErrorPage";

import Button from "../components/Button";

export default function ServerError({ onRetry }: { onRetry: () => void }) {
  const navigate = useNavigate();

  function goHome() {
    onRetry();
    void navigate("/");
  }

  return (
    <ErrorPage
      code="500"
      title={t("SOMETHING_WENT_WRONG")}
      message={t("SOMETHING_WENT_WRONG_MESSAGE")}
      actions={
        <>
          <Button onClick={onRetry}>{t("TRY_AGAIN")}</Button>
          <Button variant="secondary" onClick={goHome}>
            {t("GO_HOME")}
          </Button>
        </>
      }
    />
  );
}
