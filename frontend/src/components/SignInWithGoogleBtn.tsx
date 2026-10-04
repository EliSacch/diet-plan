import googlePill from "../assets/signin-assets/Android + Web/SVG/Dark/Theme=Dark, Show text=Yes, Shape=Pill, Platform=Android+Web.svg";

export default function SignInWithGoogleBtn() {
  return (
    <a className="continue" href="/auth/google">
      <img src={googlePill} alt="Sign in with Google" width={180} height={40} />
    </a>
  );
}
