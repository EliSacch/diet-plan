import { useSessionContext } from "../hooks/useSessionContext";
import { t } from "../i18n";

import UploadDietPlan from "../components/buttons/UploadDietPlan";
import PageLayout from "../components/layouts/PageLayout";

export default function Profile() {
  const session = useSessionContext();

  if (session.status !== "signedIn") {
    return null;
  }

  return (
    <PageLayout title={t("PROFILE")}>
      <p>{session.email}</p>
      <UploadDietPlan />
      <button className="sign-out" type="button" onClick={session.signOut}>
        {t("SIGN_OUT")}
      </button>
    </PageLayout>
  );
}
