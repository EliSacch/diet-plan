import { Link } from "react-router-dom";

import { getLocale, t } from "../i18n";
import { addDays, addWeeks, parseIsoDate } from "../utils/week";

import "./WeekNavigator.css";

const rangeFormat = { day: "numeric", month: "short", year: "numeric" } as const;

function Chevron({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export default function WeekNavigator({ weekStart }: { weekStart: string }) {
  const monday = parseIsoDate(weekStart);
  if (monday === null) {
    return null;
  }
  const range = new Intl.DateTimeFormat(getLocale(), rangeFormat).formatRange(
    monday,
    addDays(monday, 6),
  );

  return (
    <nav className="week-navigator" aria-label={t("WEEK")}>
      <Link
        to={`/weeks/${addWeeks(weekStart, -1)}`}
        className="week-navigator-arrow"
        aria-label={t("PREVIOUS_WEEK")}
      >
        <Chevron path="m15 6-6 6 6 6" />
      </Link>
      <p className="week-navigator-range" aria-live="polite">
        {range}
      </p>
      <Link
        to={`/weeks/${addWeeks(weekStart, 1)}`}
        className="week-navigator-arrow"
        aria-label={t("NEXT_WEEK")}
      >
        <Chevron path="m9 6 6 6-6 6" />
      </Link>
    </nav>
  );
}
