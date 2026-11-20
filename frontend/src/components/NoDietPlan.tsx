import { t } from "../i18n";
import Logo from "./Logo";
import UploadDietPlan from "./UploadDietPlan";

import "./NoDietPlan.css";

export default function NoDietPlan({ welcome = false }: { welcome?: boolean }) {
  return (
    <div className="no-diet-plan">
      {welcome ? <Logo heading={false} /> : null}
      <p>{t(welcome ? "WELCOME_UPLOAD_MEAL_PLAN" : "NO_DIET_PLAN_YET")}</p>
      <UploadDietPlan />
    </div>
  );
}
