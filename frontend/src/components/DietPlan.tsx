import { useId, useState } from "react";

import { t } from "../i18n";
import type { PlanDocument, PlanOption } from "../types/diet-plan";

import "./DietPlan.css";

function optionLabel(option: PlanOption) {
  if (option.amount === null) {
    return option.name;
  }
  if (option.unit === null) {
    return `${option.name} ${option.amount}`;
  }
  return `${option.name} ${option.amount} ${option.unit}`;
}

export default function DietPlan({ plan }: { plan: PlanDocument }) {
  const selectId = useId();
  const [selectedIndex, setDayIndex] = useState(0);
  const dayIndex = selectedIndex < plan.days.length ? selectedIndex : 0;
  const day = plan.days[dayIndex];

  if (day === undefined) {
    return null;
  }

  return (
    <div className="diet-plan">
      <div className="diet-plan-day-picker">
        <label htmlFor={selectId}>{t("DAY")}</label>
        <div className="diet-plan-select">
          <select
            id={selectId}
            value={dayIndex}
            onChange={(event) => setDayIndex(Number(event.target.value))}
          >
            {plan.days.map((item, index) => (
              <option key={item.day} value={index}>
                {item.day}
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
      {day.meals.map((meal) => (
        <section key={meal.meal} className="diet-plan-meal">
          <h2>{meal.meal}</h2>
          {meal.categories.map((category) => (
            <section key={category.category}>
              <h3>{category.category}</h3>
              <ul>
                {category.options.map((option) => (
                  <li key={`${option.position}-${option.name}`}>{optionLabel(option)}</li>
                ))}
              </ul>
            </section>
          ))}
        </section>
      ))}
    </div>
  );
}
