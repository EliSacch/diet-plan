import { useEffect, useRef, useState } from "react";

import { getLocale, t } from "../i18n";
import type { DayChoice, DayOptions } from "../types/day";
import { addDays, parseIsoDate, toIsoDate } from "../utils/date";
import ConfirmModal from "./ConfirmModal";
import DayPlanner from "./DayPlanner";
import Drawer from "./Drawer";
import Loader from "./Loader";

import "./DayPlannerDrawer.css";

type DayPlannerDrawerProps = {
  open: boolean;
  date: string;
  day: DayOptions | null | undefined;
  choices: DayChoice[] | undefined;
  loading?: boolean;
  error?: string | null;
  onDateChange: (isoDate: string) => void;
  isDateDisabled?: (date: Date) => boolean;
  onSave: (choices: DayChoice[]) => void;
  saving: boolean;
  onClose: () => void;
};

type PendingIntent = { type: "close" } | { type: "date"; isoDate: string } | null;

function Chevron({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

function nextEnabledDate(
  start: Date,
  step: -1 | 1,
  isDateDisabled: (date: Date) => boolean,
): Date | null {
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addDays(start, step * offset);
    if (!isDateDisabled(candidate)) {
      return candidate;
    }
  }
  return null;
}

function OpenDayPlannerDrawer({
  date,
  day,
  choices,
  loading = false,
  error = null,
  onDateChange,
  isDateDisabled = () => false,
  onSave,
  saving,
  onClose,
}: Omit<DayPlannerDrawerProps, "open">) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent>(null);

  useEffect(() => {
    (bodyRef.current as HTMLDivElement).scrollTop = 0;
  }, [date]);

  function requestClose() {
    if (dirty) {
      setPendingIntent({ type: "close" });
    } else {
      onClose();
    }
  }

  function requestDateChange(nextIsoDate: string) {
    if (dirty) {
      setPendingIntent({ type: "date", isoDate: nextIsoDate });
    } else {
      onDateChange(nextIsoDate);
    }
  }

  function confirmDiscard() {
    const intent = pendingIntent as Exclude<PendingIntent, null>;
    setPendingIntent(null);
    setDirty(false);
    if (intent.type === "close") {
      onClose();
    } else {
      onDateChange(intent.isoDate);
    }
  }

  const parsedDate = parseIsoDate(date);
  const dateLabel =
    parsedDate === null
      ? (day?.day ?? "")
      : new Intl.DateTimeFormat(getLocale(), {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(parsedDate);

  const previous = parsedDate === null ? null : nextEnabledDate(parsedDate, -1, isDateDisabled);
  const next = parsedDate === null ? null : nextEnabledDate(parsedDate, 1, isDateDisabled);

  const stepper = (
    <div className="day-planner-drawer-stepper">
      <button
        type="button"
        className="day-planner-drawer-arrow"
        aria-label={t("PREVIOUS_DAY")}
        disabled={previous === null}
        onClick={() => requestDateChange(toIsoDate(previous as Date))}
      >
        <Chevron path="m15 6-6 6 6 6" />
      </button>
      <p className="day-planner-drawer-date" aria-live="polite">
        {dateLabel}
      </p>
      <button
        type="button"
        className="day-planner-drawer-arrow"
        aria-label={t("NEXT_DAY")}
        disabled={next === null}
        onClick={() => requestDateChange(toIsoDate(next as Date))}
      >
        <Chevron path="m9 6 6 6-6 6" />
      </button>
    </div>
  );

  let body;
  if (error !== null) {
    body = <p role="alert">{error}</p>;
  } else if (loading || choices === undefined || day === undefined) {
    body = <Loader label={t("LOADING_YOUR_DAY")} />;
  } else if (day === null) {
    body = <p>{t("NO_OPTIONS_FOR_DAY")}</p>;
  } else {
    body = (
      <DayPlanner
        key={date}
        day={day}
        choices={choices}
        onSave={onSave}
        saving={saving}
        onDirtyChange={setDirty}
      />
    );
  }

  return (
    <>
      <Drawer
        open
        title={t("PLAN_THIS_DAY")}
        onClose={requestClose}
        headerExtras={stepper}
        bodyRef={bodyRef}
        closeDisabled={pendingIntent !== null}
      >
        <div className="plan-sections">{body}</div>
      </Drawer>
      <ConfirmModal
        open={pendingIntent !== null}
        title={t("UNSAVED_CHANGES_TITLE")}
        confirmLabel={t("DISCARD")}
        cancelLabel={t("CANCEL")}
        onConfirm={confirmDiscard}
        onCancel={() => setPendingIntent(null)}
      >
        <p>{t("UNSAVED_CHANGES_MESSAGE")}</p>
      </ConfirmModal>
    </>
  );
}

export default function DayPlannerDrawer({ open, ...props }: DayPlannerDrawerProps) {
  if (!open) {
    return null;
  }
  return <OpenDayPlannerDrawer {...props} />;
}
