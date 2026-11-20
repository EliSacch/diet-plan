import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { getLocale, t } from "../i18n";
import { addDays, parseIsoDate, todayIso, toIsoDate } from "../utils/date";

import "./DateStrip.css";

const RADIUS = 15;

type DateStripProps = {
  value: string;
  onChange: (isoDate: string) => void;
  isDateDisabled?: (date: Date) => boolean;
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

function nextEnabledDate(
  start: Date,
  step: -1 | 1,
  isDateDisabled: (date: Date) => boolean,
): Date | null {
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = addDays(start, step * offset);
    if (!isDateDisabled(candidate)) {
      return candidate;
    }
  }
  return null;
}

function onDaysKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  const buttons = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
  );
  const current = buttons.indexOf(event.target as HTMLButtonElement);
  const last = buttons.length - 1;
  const targets: Partial<Record<string, number>> = {
    ArrowLeft: Math.max(current - 1, 0),
    ArrowRight: Math.min(current + 1, last),
    Home: 0,
    End: last,
  };
  const target = targets[event.key];
  if (target === undefined) {
    return;
  }
  event.preventDefault();
  (buttons[target] as HTMLButtonElement).focus();
}

export default function DateStrip({
  value,
  onChange,
  isDateDisabled = () => false,
}: DateStripProps) {
  const [today] = useState(todayIso);
  const activeRef = useRef<HTMLButtonElement>(null);
  const hasMountedRef = useRef(false);
  const selected = parseIsoDate(value);

  useEffect(() => {
    const button = activeRef.current;
    if (button === null) {
      return;
    }
    const behavior = hasMountedRef.current ? "smooth" : "instant";
    hasMountedRef.current = true;
    button.scrollIntoView({ behavior, inline: "center", block: "nearest" });
  }, [value]);

  if (selected === null) {
    return null;
  }

  const locale = getLocale();
  const dates = Array.from({ length: 2 * RADIUS + 1 }, (_, index) =>
    addDays(selected, index - RADIUS),
  );
  const month = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(selected);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const fullDate = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const previous = nextEnabledDate(selected, -1, isDateDisabled);
  const next = nextEnabledDate(selected, 1, isDateDisabled);

  return (
    <div className="date-strip">
      <p className="date-strip-month" aria-live="polite">
        {month}
      </p>
      <div className="date-strip-row">
        <button
          type="button"
          className="date-strip-arrow"
          aria-label={t("PREVIOUS_DAY")}
          disabled={previous === null}
          onClick={() => onChange(toIsoDate(previous as Date))}
        >
          <Chevron path="m15 6-6 6 6 6" />
        </button>
        {/* Arrow keys move inside the group. Enter or Space selects the focused day. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <div
          className="date-strip-days"
          role="group"
          aria-label={t("DAY")}
          onKeyDown={onDaysKeyDown}
        >
          {dates.map((date) => {
            const iso = toIsoDate(date);
            const isSelected = iso === value;
            return (
              <button
                key={iso}
                ref={isSelected ? activeRef : undefined}
                type="button"
                className="date-strip-day"
                aria-label={fullDate.format(date)}
                aria-pressed={isSelected}
                aria-current={iso === today ? "date" : undefined}
                tabIndex={isSelected ? 0 : -1}
                disabled={isDateDisabled(date)}
                onClick={() => onChange(iso)}
              >
                <span className="date-strip-circle">{date.getDate()}</span>
                <span className="date-strip-weekday">{weekday.format(date)}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="date-strip-arrow"
          aria-label={t("NEXT_DAY")}
          disabled={next === null}
          onClick={() => onChange(toIsoDate(next as Date))}
        >
          <Chevron path="m9 6 6 6-6 6" />
        </button>
      </div>
    </div>
  );
}
