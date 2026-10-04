import { Route, Routes } from "react-router-dom";

import Home from "./Home.tsx";
import Profile from "./Profile.tsx";
import RequireSession from "./RequireSession.tsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<RequireSession />}>
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
