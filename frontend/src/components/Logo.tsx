import "./Logo.css";

import logo from "../assets/logo.png";

export default function Logo({ heading = true }: { heading?: boolean }) {
  const Tag = heading ? "h1" : "div";
  return (
    <Tag className="logo">
      <img src={logo} alt="" width={72} height={72} />
      <span className="logo-wordmark">
        <span className="logo-diet">Diet</span>
        <span className="logo-plan">Plan</span>
      </span>
    </Tag>
  );
}
