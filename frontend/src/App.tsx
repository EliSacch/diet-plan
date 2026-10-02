import { useEffect, useState } from "react";
import { messageForProblem } from "./i18n";
import "./App.css";

type Profile = {
  id: number;
  email: string;
};

type Problem = {
  code?: string;
  detail?: string;
};

type SessionState =
  | { kind: "loading" }
  | { kind: "signedOut" }
  | { kind: "signedIn"; email: string }
  | { kind: "error"; message: string };

async function problemMessage(response: Response) {
  const problem = (await response.json().catch(() => ({}))) as Problem;
  return messageForProblem(problem);
}

function messageFrom(error: unknown) {
  if (error instanceof DOMException) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

function App() {
  const [state, setState] = useState<SessionState>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/profile", { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          setState({ kind: "signedOut" });
          return;
        }
        if (!response.ok) {
          throw new Error(await problemMessage(response));
        }
        const profile = (await response.json()) as Profile;
        setState({ kind: "signedIn", email: profile.email });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setState({ kind: "error", message: messageFrom(error) });
      });

    return () => controller.abort();
  }, []);

  async function signOut() {
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await problemMessage(response));
      }
      setState({ kind: "signedOut" });
    } catch (error: unknown) {
      setState({ kind: "error", message: messageFrom(error) });
    }
  }

  return (
    <main>
      {state.kind === "loading" && <p>Checking your session…</p>}
      {state.kind === "signedOut" && (
        <>
          <h1>Sign in</h1>
          <a className="continue" href="/auth/google">
            Continue with Google
          </a>
        </>
      )}
      {state.kind === "signedIn" && (
        <>
          <h1>Home</h1>
          <p>{state.email}</p>
          <button className="sign-out" type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </>
      )}
      {state.kind === "error" && <p role="alert">{state.message}</p>}
    </main>
  );
}

export default App;
