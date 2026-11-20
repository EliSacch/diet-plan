import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useSessionContext } from "../hooks/useSessionContext";
import { t } from "../i18n";
import SessionLayout from "../layouts/SessionLayout";

import Loader from "../components/Loader";
import Home from "../pages/Home";
import Login from "../pages/Login";

export default function Root() {
  const session = useSessionContext();
  const signedIn = session.status === "signedIn";
  const title =
    session.status === "loading"
      ? t("CHECKING_YOUR_SESSION")
      : session.status === "error"
        ? t("SOMETHING_WENT_WRONG")
        : t("SIGN_IN_WITH_GOOGLE");
  useDocumentTitle(signedIn ? null : title);

  if (signedIn) {
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
