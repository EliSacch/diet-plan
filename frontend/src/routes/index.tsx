import { Route, Routes } from "react-router-dom";

import RequireSession from "./RequireSession.tsx";
import Root from "./Root.tsx";

import ActiveDietPlan from "../pages/ActiveDietPlan.tsx";
import Profile from "../pages/Profile.tsx";
import WeekPlan from "../pages/WeekPlan.tsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route element={<RequireSession />}>
        <Route path="/weeks" element={<WeekPlan />} />
        <Route path="/weeks/:weekStart" element={<WeekPlan />} />
        <Route path="/diet-plan" element={<ActiveDietPlan />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
