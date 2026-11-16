import { useState } from "react";

import { Navigate, useParams } from "react-router-dom";

import { dietPlanErrorMessage } from "../hooks/useActiveDietPlan";
import { useToast } from "../hooks/useToast";
import { useSaveWeek, useWeek, useWeekOptions } from "../hooks/useWeek";
import { t } from "../i18n";
import PageLayout from "../layouts/PageLayout";
import type { WeekChoice } from "../types/week";
import { currentMonday, mondayOf, parseIsoDate, toIsoDate, weekDates } from "../utils/week";

import Loader from "../components/Loader";
import NoDietPlan from "../components/NoDietPlan";
import WeekDayPicker from "../components/WeekDayPicker";
import WeekPlanner from "../components/WeekPlanner";

import "../styles/plan-sections.css";
import "./WeekPlan.css";

function todayIndex(weekStart: string) {
  const today = toIsoDate(new Date());
  return Math.max(0, weekDates(weekStart).map(toIsoDate).indexOf(today));
}

function weekHref(weekStart: string) {
  return `/weeks/${weekStart}`;
}

function WeekContent({ weekStart }: { weekStart: string }) {
  const options = useWeekOptions(weekStart);
  const week = useWeek(weekStart);
  const save = useSaveWeek(weekStart);
  const showToast = useToast();
  const [dayIndex, setDayIndex] = useState(() => todayIndex(weekStart));
  const dayCount = options.data?.days.length ?? 7;
  const selectedDay = dayIndex < dayCount ? dayIndex : 0;

  function onSave(choices: WeekChoice[]) {
    save.mutate(choices, {
      onSuccess: () => showToast({ message: t("WEEK_SAVED") }),
      onError: (error) => showToast({ message: dietPlanErrorMessage(error), variant: "error" }),
    });
  }

  let content;
  if (options.isError) {
    content = <p role="alert">{dietPlanErrorMessage(options.error)}</p>;
  } else if (week.isError) {
    content = <p role="alert">{dietPlanErrorMessage(week.error)}</p>;
  } else if (options.isPending || week.isPending) {
    content = <Loader label={t("LOADING_YOUR_WEEK")} />;
  } else if (options.data === null) {
    content = <NoDietPlan />;
  } else {
    content = (
      <WeekPlanner
        options={options.data}
        choices={week.data.choices}
        dayIndex={selectedDay}
        onSave={onSave}
        saving={save.isPending}
      />
    );
  }

  return (
    <div className="plan-sections week-plan">
      <WeekDayPicker
        weekStart={weekStart}
        value={selectedDay}
        onChange={setDayIndex}
        weekHref={weekHref}
        isDayDisabled={(index) => index >= dayCount}
      />
      {content}
    </div>
  );
}

export default function WeekPlan() {
  const { weekStart } = useParams();
  const date = weekStart === undefined ? null : parseIsoDate(weekStart);

  if (date === null) {
    return <Navigate to={`/weeks/${currentMonday()}`} replace />;
  }
  const monday = toIsoDate(mondayOf(date));
  if (monday !== weekStart) {
    return <Navigate to={`/weeks/${monday}`} replace />;
  }

  return (
    <PageLayout title={t("WEEK")}>
      <WeekContent key={monday} weekStart={monday} />
    </PageLayout>
  );
}
