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
  const baseId = useId();
  const optionsId = `${baseId}-options`;
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selectedIndex, setDayIndex] = useState(0);
  const dayIndex = selectedIndex < plan.days.length ? selectedIndex : 0;
  const day = plan.days[dayIndex];
  const names = categoryNames(plan);

  if (day === undefined) {
    return null;
  }

  function selectDay(index: number) {
    setDayIndex(index);
    setExpanded(new Set());
  }

  function toggleCategory(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
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
      <DayPicker days={plan.days.map((item) => item.day)} value={dayIndex} onChange={selectDay} />
      {day.meals.map((meal, mealIndex) => (
        <section key={meal.meal} className="plan-sections-meal">
          <h2>{meal.meal}</h2>
          {meal.categories.map((category, categoryIndex) => {
            const key = `${meal.meal}|${category.category}`;
            const panelId = `${baseId}-${mealIndex}-${categoryIndex}`;
            const open = expanded.has(key);
            return (
              <section key={category.category}>
                <h3 className="diet-plan-category-heading">
                  <button
                    type="button"
                    className="diet-plan-category"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => toggleCategory(key)}
                  >
                    <span>{category.category}</span>
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
                </h3>
                <ul id={panelId} className="diet-plan-category-options" hidden={!open}>
                  {category.options.map((option) => (
                    <li key={`${option.position}-${option.name}`}>{optionLabel(option)}</li>
                  ))}
                </ul>
              </section>
            );
          })}
        </section>
      ))}
    </div>
  );
}
