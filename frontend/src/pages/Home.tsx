import { useState } from "react";

import { useSearchParams } from "react-router-dom";

import { dietPlanErrorMessage, useActiveDietPlan } from "../hooks/useActiveDietPlan";
import { useToast } from "../hooks/useToast";
import { useSaveWeek, useWeek } from "../hooks/useWeek";
import { t } from "../i18n";
import PageLayout from "../layouts/PageLayout";
import type { PlanDocument } from "../types/diet-plan";
import type { WeekChoice } from "../types/week";
import { currentMonday, mondayOf, parseIsoDate, todayIndex, toIsoDate } from "../utils/week";

import DailyChoices from "../components/DailyChoices";
import Loader from "../components/Loader";
import NoDietPlan from "../components/NoDietPlan";
import WeekDayPicker from "../components/WeekDayPicker";
import WeekPlannerDrawer from "../components/WeekPlannerDrawer";

import "../styles/plan-sections.css";

function resolveWeekStart(param: string | null) {
  const date = param === null ? null : parseIsoDate(param);
  return date === null ? currentMonday() : toIsoDate(mondayOf(date));
}

function homeWeekHref(weekStart: string) {
  return `/?week=${weekStart}`;
}

function HomeWeek({ weekStart, plan }: { weekStart: string; plan: PlanDocument }) {
  const week = useWeek(weekStart);
  const save = useSaveWeek(weekStart);
  const showToast = useToast();
  const [dayIndex, setDayIndex] = useState(() => todayIndex(weekStart));
  const [plannerOpen, setPlannerOpen] = useState(false);
  const dayCount = plan.days.length;
  const selectedDay = dayIndex < dayCount ? dayIndex : 0;
  const day = plan.days[selectedDay];

  function onSave(choices: WeekChoice[]) {
    save.mutate(choices, {
      onSuccess: () => showToast({ message: t("WEEK_SAVED") }),
      onError: (error) => showToast({ message: dietPlanErrorMessage(error), variant: "error" }),
    });
  }

  let content;
  if (week.isError) {
    content = <p role="alert">{dietPlanErrorMessage(week.error)}</p>;
  } else if (week.isPending) {
    content = <Loader label={t("LOADING_YOUR_WEEK")} />;
  } else if (day === undefined) {
    content = null;
  } else {
    content = (
      <DailyChoices day={day} choices={week.data.choices} onPlan={() => setPlannerOpen(true)} />
    );
  }

  return (
    <div className="plan-sections">
      <WeekDayPicker
        weekStart={weekStart}
        value={selectedDay}
        onChange={setDayIndex}
        weekHref={homeWeekHref}
        isDayDisabled={(index) => index >= dayCount}
      />
      {content}
      {week.data !== undefined ? (
        <WeekPlannerDrawer
          open={plannerOpen}
          weekStart={weekStart}
          options={plan}
          choices={week.data.choices}
          dayIndex={selectedDay}
          onDayChange={setDayIndex}
          onSave={onSave}
          saving={save.isPending}
          onClose={() => setPlannerOpen(false)}
        />
      ) : null}
    </div>
  );
}

export default function Home() {
  const [searchParams] = useSearchParams();
  const plan = useActiveDietPlan();
  const weekStart = resolveWeekStart(searchParams.get("week"));

  let content;
  if (plan.isPending) {
    content = <Loader label={t("LOADING_YOUR_DIET_PLAN")} />;
  } else if (plan.isError) {
    content = <p role="alert">{dietPlanErrorMessage(plan.error)}</p>;
  } else if (plan.data === null) {
    content = <NoDietPlan />;
  } else {
    content = <HomeWeek key={weekStart} weekStart={weekStart} plan={plan.data} />;
  }

  return <PageLayout>{content}</PageLayout>;
}
