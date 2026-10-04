import { Navigate, Outlet } from "react-router-dom";

import { useSessionContext } from "../hooks/useSessionContext";

export default function RequireSession() {
  const session = useSessionContext();

  if (session.status === "loading") {
    return (
      <main>
        <p>Checking your session…</p>
      </main>
    );
  }

  if (session.status !== "signedIn") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
