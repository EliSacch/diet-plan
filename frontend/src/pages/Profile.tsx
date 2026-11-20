import { useId, useState } from "react";

import { useActiveDietPlan } from "../hooks/useActiveDietPlan";
import { useSessionContext } from "../hooks/useSessionContext";
import { getLocale, t } from "../i18n";
import PageLayout from "../layouts/PageLayout";
import type { ActiveDietPlan } from "../types/diet-plan";

import Button from "../components/Button";
import ConfirmModal from "../components/ConfirmModal";
import UploadDietPlan from "../components/UploadDietPlan";

import "./Profile.css";

function accountInitial(email: string) {
  return email.trim().charAt(0).toUpperCase();
}

function formatUploadDate(value: string) {
  return new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function uploadedFile(plan: ActiveDietPlan | null | undefined) {
  if (plan == null || !plan.source_filename) {
    return null;
  }
  return { filename: plan.source_filename, uploadedAt: plan.uploaded_at };
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

export default function Profile() {
  const session = useSessionContext();
  const plan = useActiveDietPlan();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const accountId = useId();
  const fileHeadingId = useId();

  if (session.status !== "signedIn") {
    return null;
  }

  const { signOut } = session;
  const file = uploadedFile(plan.data);

  function confirmSignOut() {
    setConfirmingSignOut(false);
    signOut();
  }

  return (
    <PageLayout title={t("PROFILE")}>
      <div className="profile">
        <section className="profile-card profile-account" aria-labelledby={accountId}>
          <div className="profile-identity">
            <span className="profile-avatar" aria-hidden="true">
              {accountInitial(session.email)}
            </span>
            <div className="profile-identity-text">
              <p id={accountId} className="profile-kicker">
                {t("ACCOUNT")}
              </p>
              <p className="profile-email">{session.email}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => setConfirmingSignOut(true)}>
            {t("SIGN_OUT")}
          </Button>
        </section>
        {file !== null ? (
          <section className="profile-card profile-file" aria-labelledby={fileHeadingId}>
            <h2 id={fileHeadingId}>{t("UPLOADED_FILE")}</h2>
            <div className="profile-file-row">
              <span className="profile-file-icon">
                <FileIcon />
              </span>
              <div className="profile-file-body">
                <p className="profile-file-name">{file.filename}</p>
                <p className="profile-file-meta">
                  {t("UPLOAD_DATE")}{" "}
                  <time dateTime={file.uploadedAt}>{formatUploadDate(file.uploadedAt)}</time>
                </p>
              </div>
            </div>
          </section>
        ) : null}
        <UploadDietPlan />
      </div>
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
