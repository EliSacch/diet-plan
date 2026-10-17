import { useSessionContext } from "../hooks/useSessionContext";
import { t } from "../i18n";

import Home from "../pages/Home";
import Login from "../pages/Login";

export default function Root() {
  const session = useSessionContext();

  const content = () => {
    switch (session.status) {
      case "loading":
        return <p>{t("CHECKING_YOUR_SESSION")}</p>;
      case "error":
        return <p role="alert">{session.message}</p>;
      case "signedOut":
        return <Login />;
      case "signedIn":
        return <Home />;
    }
  };

  return (
    <main>{content()}</main>
  );
}
