import { useEffect, useRef, useState } from "react";

import { getLocale, t } from "../i18n";
import type { PlanDocument } from "../types/diet-plan";
import type { WeekChoice } from "../types/week";
import { weekDates } from "../utils/week";
import ConfirmModal from "./ConfirmModal";
import Drawer from "./Drawer";
import WeekPlanner from "./WeekPlanner";

import "./WeekPlannerDrawer.css";

type WeekPlannerDrawerProps = {
  open: boolean;
  weekStart: string;
  options: PlanDocument;
  choices: WeekChoice[];
  dayIndex: number;
  onDayChange: (index: number) => void;
  onSave: (choices: WeekChoice[]) => void;
  saving: boolean;
  onClose: () => void;
};

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

function OpenWeekPlannerDrawer({
  weekStart,
  options,
  choices,
  dayIndex,
  onDayChange,
  onSave,
  saving,
  onClose,
}: Omit<WeekPlannerDrawerProps, "open">) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  function requestClose() {
    if (dirty) {
      setConfirmingDiscard(true);
    } else {
      onClose();
    }
  }

  useEffect(() => {
    (bodyRef.current as HTMLDivElement).scrollTop = 0;
  }, [dayIndex]);

  const dates = weekDates(weekStart);
  const currentDate = dates[dayIndex];
  const dayCount = options.days.length;
  const dateLabel =
    currentDate === undefined
      ? (options.days[dayIndex]?.day ?? "")
      : new Intl.DateTimeFormat(getLocale(), {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(currentDate);

  const stepper = (
    <div className="week-planner-drawer-stepper">
      <button
        type="button"
        className="week-planner-drawer-arrow"
        aria-label={t("PREVIOUS_DAY")}
        disabled={dayIndex <= 0}
        onClick={() => onDayChange(dayIndex - 1)}
      >
        <Chevron path="m15 6-6 6 6 6" />
      </button>
      <p className="week-planner-drawer-date" aria-live="polite">
        {dateLabel}
      </p>
      <button
        type="button"
        className="week-planner-drawer-arrow"
        aria-label={t("NEXT_DAY")}
        disabled={dayIndex >= dayCount - 1}
        onClick={() => onDayChange(dayIndex + 1)}
      >
        <Chevron path="m9 6 6 6-6 6" />
      </button>
    </div>
  );

  return (
    <>
      <Drawer
        open
        title={t("PLAN_THIS_WEEK")}
        onClose={requestClose}
        headerExtras={stepper}
        bodyRef={bodyRef}
        closeDisabled={confirmingDiscard}
      >
        <div className="plan-sections">
          <WeekPlanner
            options={options}
            choices={choices}
            dayIndex={dayIndex}
            onSave={onSave}
            saving={saving}
            onDirtyChange={setDirty}
          />
        </div>
      </Drawer>
      <ConfirmModal
        open={confirmingDiscard}
        title={t("UNSAVED_CHANGES_TITLE")}
        confirmLabel={t("DISCARD")}
        cancelLabel={t("CANCEL")}
        onConfirm={() => {
          setConfirmingDiscard(false);
          onClose();
        }}
        onCancel={() => setConfirmingDiscard(false)}
      >
        <p>{t("UNSAVED_CHANGES_MESSAGE")}</p>
      </ConfirmModal>
    </>
  );
}

export default function WeekPlannerDrawer({ open, ...props }: WeekPlannerDrawerProps) {
  if (!open) {
    return null;
  }
  return <OpenWeekPlannerDrawer {...props} />;
}
