import { Navigate, Outlet } from "react-router-dom";

import { useSessionContext } from "../hooks/useSessionContext";
import { t } from "../i18n";

import SessionLayout from "../components/layouts/SessionLayout";
import Loader from "../components/Loader";

export default function RequireSession() {
  const session = useSessionContext();

  if (session.status === "loading") {
    return (
      <SessionLayout>
        <Loader label={t("CHECKING_YOUR_SESSION")} />
      </SessionLayout>
    );
  }

  if (session.status !== "signedIn") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
