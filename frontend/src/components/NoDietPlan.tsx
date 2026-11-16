import { t } from "../i18n";
import UploadDietPlan from "./UploadDietPlan";

import "./NoDietPlan.css";

export default function NoDietPlan() {
  return (
    <div className="no-diet-plan">
      <p>{t("NO_DIET_PLAN_YET")}</p>
      <UploadDietPlan />
    </div>
  );
}
