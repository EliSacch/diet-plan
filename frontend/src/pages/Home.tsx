import { useState } from "react";

import { isAxiosError } from "axios";
import { useSearchParams } from "react-router-dom";

import { dietPlanErrorMessage, useActiveDietPlan } from "../hooks/useActiveDietPlan";
import { useCreateCustomOption, useDeleteCustomOption } from "../hooks/useCustomOptions";
import { useDay, useDayOptions, useSaveDay } from "../hooks/useDay";
import { useToast } from "../hooks/useToast";
import { t } from "../i18n";
import PageLayout from "../layouts/PageLayout";
import type { CustomOptionInput } from "../types/custom-option";
import type { DayChoice } from "../types/day";
import type { PlanDocument } from "../types/diet-plan";
import { addDays, parseIsoDate, todayIso, toIsoDate, weekdayIndex } from "../utils/date";

import DailyChoices from "../components/DailyChoices";
import DateStrip from "../components/DateStrip";
import DayPlannerDrawer from "../components/DayPlannerDrawer";
import Loader from "../components/Loader";
import NoDietPlan from "../components/NoDietPlan";

import "../styles/plan-sections.css";

function resolveSelectedDate(param: string | null, dayCount: number) {
  let candidate = (param === null ? null : parseIsoDate(param)) ?? parseIsoDate(todayIso())!;
  if (dayCount > 0) {
    while (weekdayIndex(candidate) >= dayCount) {
      candidate = addDays(candidate, -1);
    }
  }
  return toIsoDate(candidate);
}

function HomeDay({
  selectedDate,
  onSelectDate,
  plan,
}: {
  selectedDate: string;
  onSelectDate: (isoDate: string) => void;
  plan: PlanDocument;
}) {
  const day = useDay(selectedDate);
  const save = useSaveDay(selectedDate);
  const deleteCustomOption = useDeleteCustomOption();
  const createCustomOption = useCreateCustomOption();
  const showToast = useToast();
  const [plannerOpen, setPlannerOpen] = useState(false);
  const options = useDayOptions(selectedDate, { enabled: plannerOpen });

  const dayCount = plan.days.length;
  const isDateDisabled = (candidate: Date) => weekdayIndex(candidate) >= dayCount;
  const parsed = parseIsoDate(selectedDate)!;
  const planDay = plan.days[weekdayIndex(parsed)];

  function onSave(choices: DayChoice[]) {
    save.mutate(choices, {
      onSuccess: () => showToast({ message: t("DAY_SAVED") }),
      onError: (error) => showToast({ message: dietPlanErrorMessage(error), variant: "error" }),
    });
  }

  function onDeleteCustomOption(id: number) {
    deleteCustomOption.mutate(id, {
      onSuccess: () => showToast({ message: t("CUSTOM_OPTION_DELETED") }),
      onError: (error) => showToast({ message: dietPlanErrorMessage(error), variant: "error" }),
    });
  }

  async function onAddCustomOption(option: CustomOptionInput) {
    try {
      const created = await createCustomOption.mutateAsync(option);
      showToast({ message: t("CUSTOM_OPTION_ADDED") });
      return created;
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.status === 409
          ? t("CUSTOM_OPTION_EXISTS")
          : dietPlanErrorMessage(error);
      showToast({ message, variant: "error" });
      throw error;
    }
  }

  let plannerError = null;
  if (day.isError) {
    plannerError = dietPlanErrorMessage(day.error);
  } else if (options.isError) {
    plannerError = dietPlanErrorMessage(options.error);
  }

  let content;
  if (day.isError) {
    content = <p role="alert">{dietPlanErrorMessage(day.error)}</p>;
  } else if (day.isPending) {
    content = <Loader label={t("LOADING_YOUR_DAY")} />;
  } else if (planDay === undefined) {
    content = null;
  } else {
    content = (
      <DailyChoices day={planDay} choices={day.data.choices} onPlan={() => setPlannerOpen(true)} />
    );
  }

  return (
    <div className="plan-sections">
      <DateStrip value={selectedDate} onChange={onSelectDate} isDateDisabled={isDateDisabled} />
      {content}
      <DayPlannerDrawer
        open={plannerOpen}
        date={selectedDate}
        day={options.data}
        choices={day.data?.choices}
        loading={day.isPending || options.isPending}
        error={plannerError}
        onDateChange={onSelectDate}
        isDateDisabled={isDateDisabled}
        onSave={onSave}
        saving={save.isPending}
        onClose={() => setPlannerOpen(false)}
        onDeleteCustomOption={onDeleteCustomOption}
        onAddCustomOption={onAddCustomOption}
      />
    </div>
  );
}

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const plan = useActiveDietPlan();

  function selectDate(isoDate: string) {
    if (isoDate === todayIso()) {
      setSearchParams({});
    } else {
      setSearchParams({ date: isoDate });
    }
  }

  let content;
  if (plan.isPending) {
    content = <Loader label={t("LOADING_YOUR_DIET_PLAN")} />;
  } else if (plan.isError) {
    content = <p role="alert">{dietPlanErrorMessage(plan.error)}</p>;
  } else if (plan.data === null) {
    content = <NoDietPlan welcome />;
  } else {
    const selectedDate = resolveSelectedDate(searchParams.get("date"), plan.data.days.length);
    content = <HomeDay selectedDate={selectedDate} onSelectDate={selectDate} plan={plan.data} />;
  }

  return <PageLayout>{content}</PageLayout>;
}
