import { useId, useState } from "react";

import {
  sessionsErrorMessage,
  useRevokeAllSessions,
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
} from "../hooks/useSessions";
import { getLocale, t } from "../i18n";
import type { SessionInfo } from "../types/session";
import Button from "./Button";
import ConfirmModal from "./ConfirmModal";
import Loader from "./Loader";

function formatLastSeen(value: string) {
  return new Intl.DateTimeFormat(getLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function deviceLabel(device: string) {
  return device === "Unknown device" ? t("UNKNOWN_DEVICE") : device;
}

function locationLabel(location: string | null) {
  if (location == null) {
    return null;
  }
  return location === "Local network" ? t("LOCAL_NETWORK") : location;
}

type PendingConfirm =
  | { kind: "device"; session: SessionInfo }
  | { kind: "others" }
  | { kind: "all" }
  | null;

export default function SessionsSection() {
  const headingId = useId();
  const sessions = useSessions();
  const revokeOne = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const revokeAll = useRevokeAllSessions();
  const [pending, setPending] = useState<PendingConfirm>(null);

  const list = sessions.data?.sessions ?? [];
  const hasOthers = list.some((session) => !session.is_current);
  const busy = revokeOne.isPending || revokeOthers.isPending || revokeAll.isPending;

  function closeConfirm() {
    setPending(null);
  }

  function confirmPending() {
    const action = pending;
    setPending(null);
    switch (action?.kind) {
      case "device":
        revokeOne.mutate(action.session.id);
        break;
      case "others":
        revokeOthers.mutate();
        break;
      case "all":
        revokeAll.mutate();
        break;
      default:
        break;
    }
  }

  return (
    <section className="profile-card profile-sessions" aria-labelledby={headingId}>
      <h2 id={headingId}>{t("SESSIONS")}</h2>
      {sessions.isPending ? <Loader label={t("LOADING_SESSIONS")} /> : null}
      {sessions.isError ? <p role="alert">{sessionsErrorMessage(sessions.error)}</p> : null}
      {sessions.isSuccess ? (
        <ul className="profile-session-list">
          {list.map((session) => {
            const location = locationLabel(session.location);
            const revokeLabel = `${t("SIGN_OUT_DEVICE")}: ${deviceLabel(session.device)}`;
            return (
              <li key={session.id} className="profile-session">
                <div className="profile-session-body">
                  <p className="profile-session-device">{deviceLabel(session.device)}</p>
                  {location !== null ? <p className="profile-session-meta">{location}</p> : null}
                  <p className="profile-session-meta">
                    {t("LAST_USED")}{" "}
                    <time dateTime={session.last_seen_at}>
                      {formatLastSeen(session.last_seen_at)}
                    </time>
                  </p>
                  {session.is_current ? (
                    <p className="profile-session-current">{t("THIS_DEVICE")}</p>
                  ) : null}
                </div>
                {!session.is_current ? (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    aria-label={revokeLabel}
                    onClick={() => setPending({ kind: "device", session })}
                  >
                    {t("SIGN_OUT_DEVICE")}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="profile-sessions-actions">
        {hasOthers ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setPending({ kind: "others" })}
          >
            {t("SIGN_OUT_OTHERS")}
          </Button>
        ) : null}
        <Button
          variant="danger-secondary"
          disabled={busy}
          onClick={() => setPending({ kind: "all" })}
        >
          {t("SIGN_OUT_ALL")}
        </Button>
      </div>
      <ConfirmModal
        open={pending?.kind === "device"}
        title={t("SIGN_OUT_DEVICE_CONFIRM_TITLE")}
        confirmLabel={t("SIGN_OUT_DEVICE")}
        cancelLabel={t("CANCEL")}
        onConfirm={confirmPending}
        onCancel={closeConfirm}
      >
        <p>
          {pending?.kind === "device"
            ? `${deviceLabel(pending.session.device)}. ${t("SIGN_OUT_CONFIRM_MESSAGE")}`
            : null}
        </p>
      </ConfirmModal>
      <ConfirmModal
        open={pending?.kind === "others"}
        title={t("SIGN_OUT_OTHERS_CONFIRM_TITLE")}
        confirmLabel={t("SIGN_OUT_OTHERS")}
        cancelLabel={t("CANCEL")}
        onConfirm={confirmPending}
        onCancel={closeConfirm}
      >
        <p>{t("SIGN_OUT_OTHERS_CONFIRM_MESSAGE")}</p>
      </ConfirmModal>
      <ConfirmModal
        open={pending?.kind === "all"}
        title={t("SIGN_OUT_ALL_CONFIRM_TITLE")}
        confirmLabel={t("SIGN_OUT_ALL")}
        cancelLabel={t("CANCEL")}
        variant="danger"
        onConfirm={confirmPending}
        onCancel={closeConfirm}
      >
        <p>{t("SIGN_OUT_ALL_CONFIRM_MESSAGE")}</p>
      </ConfirmModal>
    </section>
  );
}
