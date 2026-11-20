import { dietPlanErrorMessage, useActiveDietPlan } from "../hooks/useActiveDietPlan";
import { useCategoryPreferences, useSetCategoryPreference } from "../hooks/useCategoryPreferences";
import { useToast } from "../hooks/useToast";
import { t } from "../i18n";
import PageLayout from "../layouts/PageLayout";

import DietPlan from "../components/DietPlan";
import Loader from "../components/Loader";
import NoDietPlan from "../components/NoDietPlan";

export default function ActiveDietPlan() {
  const plan = useActiveDietPlan();
  const preferences = useCategoryPreferences(plan.data != null);
  const setPreference = useSetCategoryPreference();
  const showToast = useToast();

  function onMultiSelectChange(category: string, enabled: boolean) {
    setPreference.mutate(
      { category, multi_select: enabled },
      {
        onError: (error) => showToast({ message: dietPlanErrorMessage(error), variant: "error" }),
      },
    );
  }

  let content;
  if (plan.isPending) {
    content = <Loader label={t("LOADING_YOUR_DIET_PLAN")} />;
  } else if (plan.isError) {
    content = <p role="alert">{dietPlanErrorMessage(plan.error)}</p>;
  } else if (plan.data === null) {
    content = <NoDietPlan />;
  } else if (preferences.isPending) {
    content = <Loader label={t("LOADING_YOUR_DIET_PLAN")} />;
  } else if (preferences.isError) {
    content = <p role="alert">{dietPlanErrorMessage(preferences.error)}</p>;
  } else {
    content = (
      <DietPlan
        plan={plan.data}
        multiSelect={new Set(preferences.data.map((item) => item.category))}
        onMultiSelectChange={onMultiSelectChange}
      />
    );
  }

  return <PageLayout title={t("PLAN")}>{content}</PageLayout>;
}
