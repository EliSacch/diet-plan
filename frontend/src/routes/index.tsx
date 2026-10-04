import { Route, Routes } from "react-router-dom";

import Profile from "./Profile.tsx";
import RequireSession from "./RequireSession.tsx";
import Root from "./Root.tsx";

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
