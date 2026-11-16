import { Link, NavLink } from "react-router-dom";

import { t } from "../i18n";

import "./NavBar.css";

import logo from "../assets/logo.png";

const links = [
  {
    to: "/",
    label: () => t("HOME"),
    icon: "M3 11l9-7 9 7M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5",
  },
  {
    to: "/weeks",
    label: () => t("WEEK"),
    icon: "M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  },
  {
    to: "/diet-plan",
    label: () => t("PLAN"),
    icon: "M9 4h6v3H9zM9 5.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-3M9 12h6M9 16h4",
  },
  {
    to: "/profile",
    label: () => t("PROFILE"),
    icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5a7.5 7.5 0 0 1 15 0",
  },
];

export default function NavBar() {
  return (
    <header className="nav-bar">
      <Link to="/" className="nav-bar-brand">
        <img src={logo} alt="" width={32} height={32} />
        <span>
          <span className="nav-bar-diet">Diet</span>
          <span className="nav-bar-plan">Plan</span>
        </span>
      </Link>
      <nav aria-label={t("MAIN_NAVIGATION")}>
        <ul>
          {links.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.to === "/"} className="nav-bar-link">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={link.icon} />
                </svg>
                <span>{link.label()}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
