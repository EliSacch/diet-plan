import { dietPlanErrorMessage, useActiveDietPlan } from "../hooks/useActiveDietPlan";
import { t } from "../i18n";
import PageLayout from "../layouts/PageLayout";

import Loader from "../components/Loader";
import NoDietPlan from "../components/NoDietPlan";

export default function Home() {
  const plan = useActiveDietPlan();

  let content;
  if (plan.isPending) {
    content = <Loader label={t("LOADING_YOUR_DIET_PLAN")} />;
  } else if (plan.isError) {
    content = <p role="alert">{dietPlanErrorMessage(plan.error)}</p>;
  } else if (plan.data === null) {
    content = <NoDietPlan />;
  } else {
    content = <p>{t("WEEKLY_MEAL_PLAN_COMING_SOON")}</p>;
  }

  return <PageLayout title={t("HOME")}>{content}</PageLayout>;
}
