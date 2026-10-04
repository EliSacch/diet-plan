import { useSessionContext } from "../hooks/useSessionContext";

import SignInWithGoogleBtn from "../components/SignInWithGoogleBtn";
import Logo from "../components/Logo";

export default function Home() {
  const session = useSessionContext();

  if (session.status === "loading") {
    return (
      <main>
        <p>Checking your session…</p>
      </main>
    );
  }

  if (session.status === "error") {
    return (
      <main>
        <p role="alert">{session.message}</p>
      </main>
    );
  }

  return (
    <main>
      <Logo />
      {session.status === "signedOut" && <SignInWithGoogleBtn />}
      {session.status === "signedIn" && <p>Welcome, {session.email}!</p>}
    </main>
  );
}
