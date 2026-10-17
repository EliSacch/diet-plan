import { useSessionContext } from "../hooks/useSessionContext";
import { t } from "../i18n";

import SessionLayout from "../components/layouts/SessionLayout";
import Loader from "../components/Loader";
import Home from "../pages/Home";
import Login from "../pages/Login";

export default function Root() {
  const session = useSessionContext();

  if (session.status === "signedIn") {
    return <Home />;
  }

  return (
    <SessionLayout>
      {session.status === "loading" ? <Loader label={t("CHECKING_YOUR_SESSION")} /> : null}
      {session.status === "error" ? <p role="alert">{session.message}</p> : null}
      {session.status === "signedOut" ? <Login /> : null}
    </SessionLayout>
  );
}
