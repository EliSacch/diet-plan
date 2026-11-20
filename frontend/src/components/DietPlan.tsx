import { useId, useState } from "react";

import { t } from "../i18n";
import type { PlanDocument } from "../types/diet-plan";
import { optionLabel } from "../utils/plan";
import DayPicker from "./DayPicker";

import "../styles/plan-sections.css";
import "./DietPlan.css";

function categoryNames(plan: PlanDocument) {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const category of meal.categories) {
        if (seen.has(category.category)) {
          continue;
        }
        seen.add(category.category);
        names.push(category.category);
      }
    }
  }
  return names;
}

export default function DietPlan({
  plan,
  multiSelect,
  onMultiSelectChange,
}: {
  plan: PlanDocument;
  multiSelect: ReadonlySet<string>;
  onMultiSelectChange: (category: string, enabled: boolean) => void;
}) {
  const optionsId = useId();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [selectedIndex, setDayIndex] = useState(0);
  const dayIndex = selectedIndex < plan.days.length ? selectedIndex : 0;
  const day = plan.days[dayIndex];
  const names = categoryNames(plan);

  if (day === undefined) {
    return null;
  }

  return (
    <div className="plan-sections diet-plan">
      {names.length > 0 ? (
        <section className="diet-plan-preferences">
          <h2>
            <button
              type="button"
              className="diet-plan-options"
              aria-expanded={optionsOpen}
              aria-controls={optionsId}
              onClick={() => setOptionsOpen((open) => !open)}
            >
              <span>{t("PLAN_OPTIONS")}</span>
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
            </button>
          </h2>
          <div id={optionsId} className="diet-plan-options-panel" hidden={!optionsOpen}>
            <h3>{t("ALLOW_MULTIPLE_CHOICES")}</h3>
            <ul>
              {names.map((category) => {
                const enabled = multiSelect.has(category);
                return (
                  <li key={category}>
                    <label className="diet-plan-multi">
                      <span>{category}</span>
                      <span className="diet-plan-multi-control">
                        <input
                          type="checkbox"
                          role="switch"
                          checked={enabled}
                          aria-checked={enabled}
                          aria-label={`${t("MULTIPLE")}, ${category}`}
                          onChange={(event) => onMultiSelectChange(category, event.target.checked)}
                        />
                        <span aria-hidden="true">{t("MULTIPLE")}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}
      <DayPicker days={plan.days.map((item) => item.day)} value={dayIndex} onChange={setDayIndex} />
      {day.meals.map((meal) => (
        <section key={meal.meal} className="plan-sections-meal">
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
