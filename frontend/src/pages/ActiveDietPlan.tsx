import { dietPlanErrorMessage, useActiveDietPlan } from "../hooks/useActiveDietPlan";
import { t } from "../i18n";
import PageLayout from "../layouts/PageLayout";

import DietPlan from "../components/DietPlan";
import Loader from "../components/Loader";
import NoDietPlan from "../components/NoDietPlan";

export default function ActiveDietPlan() {
  const plan = useActiveDietPlan();

  let content;
  if (plan.isPending) {
    content = <Loader label={t("LOADING_YOUR_DIET_PLAN")} />;
  } else if (plan.isError) {
    content = <p role="alert">{dietPlanErrorMessage(plan.error)}</p>;
  } else if (plan.data === null) {
    content = <NoDietPlan />;
  } else {
    content = <DietPlan plan={plan.data} />;
  }

  return <PageLayout>{content}</PageLayout>;
}
