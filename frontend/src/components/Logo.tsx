import "./Logo.css";

import logo from "../assets/logo.png";

export default function Logo() {
  return (
    <h1 className="logo">
      <img src={logo} alt="" width={72} height={72} />
      <span className="logo-wordmark">
        <span className="logo-diet">Diet</span> <span className="logo-plan">Plan</span>
      </span>
    </h1>
  );
}
