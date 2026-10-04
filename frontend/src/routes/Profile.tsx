import { useSessionContext } from "../hooks/useSessionContext";

import UploadDietPlan from "../components/UploadDietPlan";

export default function Profile() {
  const session = useSessionContext();

  if (session.status !== "signedIn") {
    return null;
  }

  return (
    <main>
      <h1>Profile</h1>
      <p>{session.email}</p>
      <UploadDietPlan />
      <button className="sign-out" type="button" onClick={session.signOut}>
        Sign out
      </button>
    </main>
  );
}
