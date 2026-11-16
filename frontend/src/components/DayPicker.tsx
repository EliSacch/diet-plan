import { useId } from "react";

import { t } from "../i18n";

import "./DayPicker.css";

type DayPickerProps = {
  days: string[];
  value: number;
  onChange: (index: number) => void;
};

export default function DayPicker({ days, value, onChange }: DayPickerProps) {
  const selectId = useId();

  return (
    <div className="day-picker">
      <label htmlFor={selectId}>{t("DAY")}</label>
      <div className="day-picker-select">
        <select
          id={selectId}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {days.map((day, index) => (
            <option key={day} value={index}>
              {day}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
