import { useSessionContext } from "../hooks/useSessionContext";
import { t } from "../i18n";

import Button from "../components/buttons/Button";
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
      <Button variant="secondary" onClick={session.signOut}>
        {t("SIGN_OUT")}
      </Button>
    </PageLayout>
  );
}
