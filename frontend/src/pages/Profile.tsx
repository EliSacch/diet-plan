import { useState } from "react";

import { useSessionContext } from "../hooks/useSessionContext";
import { t } from "../i18n";
import PageLayout from "../layouts/PageLayout";

import Button from "../components/Button";
import ConfirmModal from "../components/ConfirmModal";
import UploadDietPlan from "../components/UploadDietPlan";

export default function Profile() {
  const session = useSessionContext();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  if (session.status !== "signedIn") {
    return null;
  }

  const { signOut } = session;

  function confirmSignOut() {
    setConfirmingSignOut(false);
    signOut();
  }

  return (
    <PageLayout>
      <p>{session.email}</p>
      <UploadDietPlan />
      <Button variant="secondary" onClick={() => setConfirmingSignOut(true)}>
        {t("SIGN_OUT")}
      </Button>
      <ConfirmModal
        open={confirmingSignOut}
        title={t("SIGN_OUT_CONFIRM_TITLE")}
        confirmLabel={t("SIGN_OUT")}
        cancelLabel={t("CANCEL")}
        onConfirm={confirmSignOut}
        onCancel={() => setConfirmingSignOut(false)}
      >
        <p>{t("SIGN_OUT_CONFIRM_MESSAGE")}</p>
      </ConfirmModal>
    </PageLayout>
  );
}
