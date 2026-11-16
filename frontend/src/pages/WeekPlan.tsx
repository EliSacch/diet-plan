import { Navigate, useParams } from "react-router-dom";

import { t } from "../i18n";
import PageLayout from "../layouts/PageLayout";
import { currentMonday, mondayOf, parseIsoDate, toIsoDate } from "../utils/week";

import WeekNavigator from "../components/WeekNavigator";

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
      <WeekNavigator weekStart={monday} />
    </PageLayout>
  );
}
