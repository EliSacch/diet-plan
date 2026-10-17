import { type MouseEvent, useEffect, useState } from "react";

import { t } from "../../i18n";

import "./SignInWithGoogleBtn.css";

import googlePill from "../../assets/signin-assets/Android + Web/SVG/Dark/Theme=Dark, Show text=Yes, Shape=Pill, Platform=Android+Web.svg";

export default function SignInWithGoogleBtn() {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        setPending(false);
      }
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  function onSignIn(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    if (pending) {
      return;
    }
    const href = event.currentTarget.href;
    setPending(true);
    window.location.assign(href);
  }

  return (
    <a
      className="continue"
      href="/auth/google"
      aria-busy={pending}
      aria-label={pending ? t("SIGNING_IN") : undefined}
      onClick={onSignIn}
    >
      <img src={googlePill} alt={t("SIGN_IN_WITH_GOOGLE")} width={180} height={40} />
      {pending ? <span className="continue-spinner" /> : null}
    </a>
  );
}
