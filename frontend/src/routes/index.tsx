import { Route, Routes } from "react-router-dom";

import RequireSession from "./RequireSession.tsx";
import Root from "./Root.tsx";

import Profile from "../pages/Profile.tsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route element={<RequireSession />}>
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
