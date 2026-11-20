import { Route, Routes } from "react-router-dom";

import RequireSession from "./RequireSession.tsx";
import Root from "./Root.tsx";

import ActiveDietPlan from "../pages/ActiveDietPlan.tsx";
import NotFound from "../pages/NotFound.tsx";
import Profile from "../pages/Profile.tsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route element={<RequireSession />}>
        <Route path="/diet-plan" element={<ActiveDietPlan />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
