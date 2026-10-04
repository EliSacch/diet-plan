import { useContext } from "react";

import { SessionContext } from "../context/SessionContext";

export function useSessionContext() {
  const session = useContext(SessionContext);
  if (session === null) {
    throw new Error("useSessionContext must be used within SessionProvider");
  }
  return session;
}
