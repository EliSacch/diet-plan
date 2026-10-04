import { useSessionContext } from "../hooks/useSessionContext";

import Logo from "../components/Logo";
import Home from "../pages/Home";
import Login from "../pages/Login";

export default function Root() {
  const session = useSessionContext();

  const content = () => {
    switch (session.status) {
      case "loading":
        return <p>Checking your session…</p>;
      case "error":
        return <p role="alert">{session.message}</p>;
      case "signedOut":
        return <Login />;
      case "signedIn":
        return <Home />;
    }
  };

  return (
    <main>
      <Logo />
      {content()}
    </main>
  );
}
