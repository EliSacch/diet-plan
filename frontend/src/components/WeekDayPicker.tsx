import { useState } from "react";

import { Link } from "react-router-dom";

import { getLocale, t } from "../i18n";
import { addDays, addWeeks, parseIsoDate, toIsoDate } from "../utils/week";

import "./WeekDayPicker.css";

type WeekDayPickerProps = {
  weekStart: string;
  value: number;
  onChange: (index: number) => void;
  weekHref: (weekStart: string) => string;
  isDayDisabled?: (index: number) => boolean;
};

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

export default function WeekDayPicker({
  weekStart,
  value,
  onChange,
  weekHref,
  isDayDisabled = () => false,
}: WeekDayPickerProps) {
  const [today] = useState(() => toIsoDate(new Date()));
  const monday = parseIsoDate(weekStart);
  if (monday === null) {
    return null;
  }
  const locale = getLocale();
  const dates = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const month = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).formatRange(
    monday,
    addDays(monday, 6),
  );
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const fullDate = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <div className="week-day-picker">
      <p className="week-day-picker-month" aria-live="polite">
        {month}
      </p>
      <div className="week-day-picker-row">
        <Link
          to={weekHref(addWeeks(weekStart, -1))}
          className="week-day-picker-arrow"
          aria-label={t("PREVIOUS_WEEK")}
        >
          <Chevron path="m15 6-6 6 6 6" />
        </Link>
        <div className="week-day-picker-days" role="group" aria-label={t("DAY")}>
          {dates.map((date, index) => (
            <button
              key={toIsoDate(date)}
              type="button"
              className="week-day-picker-day"
              aria-label={fullDate.format(date)}
              aria-pressed={index === value}
              aria-current={toIsoDate(date) === today ? "date" : undefined}
              disabled={isDayDisabled(index)}
              onClick={() => onChange(index)}
            >
              <span className="week-day-picker-circle">{date.getDate()}</span>
              <span className="week-day-picker-weekday">{weekday.format(date)}</span>
            </button>
          ))}
        </div>
        <Link
          to={weekHref(addWeeks(weekStart, 1))}
          className="week-day-picker-arrow"
          aria-label={t("NEXT_WEEK")}
        >
          <Chevron path="m9 6 6 6-6 6" />
        </Link>
      </div>
    </div>
  );
}
