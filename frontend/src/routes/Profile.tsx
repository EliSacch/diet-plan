import { useSessionContext } from "../hooks/useSessionContext";
import { t } from "../i18n";

import UploadDietPlan from "../components/buttons/UploadDietPlan";

export default function Profile() {
  const session = useSessionContext();

  if (session.status !== "signedIn") {
    return null;
  }

  return (
    <main>
      <h1>{t("PROFILE")}</h1>
      <p>{session.email}</p>
      <UploadDietPlan />
      <button className="sign-out" type="button" onClick={session.signOut}>
        {t("SIGN_OUT")}
      </button>
    </main>
  );
}
