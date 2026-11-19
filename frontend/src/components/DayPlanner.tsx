import { useEffect, useId, useMemo, useState } from "react";

import { t } from "../i18n";
import type { DayChoice } from "../types/day";
import type { PlanDay, PlanOption } from "../types/diet-plan";
import { optionLabel } from "../utils/plan";
import Button from "./Button";

import "./DayPlanner.css";

type OptionValues = Pick<PlanOption, "name" | "amount" | "unit">;

// Renders inside a `.plan-sections` container.
type DayPlannerProps = {
  day: PlanDay;
  choices: DayChoice[];
  onSave: (choices: DayChoice[]) => void;
  saving: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

function slotKey(meal: string, category: string) {
  return `${meal}|${category}`;
}

function toPicks(choices: DayChoice[]) {
  return new Map(choices.map((choice) => [slotKey(choice.meal, choice.category), choice]));
}

function sameValues(a: OptionValues | undefined, b: OptionValues) {
  return a !== undefined && a.name === b.name && a.amount === b.amount && a.unit === b.unit;
}

function samePicks(a: Map<string, DayChoice>, b: Map<string, DayChoice>) {
  if (a.size !== b.size) {
    return false;
  }
  for (const [key, choice] of a) {
    if (!sameValues(b.get(key), choice)) {
      return false;
    }
  }
  return true;
}

// Saved picks whose slot is no longer in the plan are sent back so a save doesn't drop them.
function orderedChoices(day: PlanDay, picks: Map<string, DayChoice>) {
  const rest = new Map(picks);
  const ordered: DayChoice[] = [];
  for (const meal of day.meals) {
    for (const category of meal.categories) {
      const key = slotKey(meal.meal, category.category);
      const choice = rest.get(key);
      if (choice !== undefined) {
        ordered.push(choice);
        rest.delete(key);
      }
    }
  }
  return [...ordered, ...rest.values()];
}

export default function DayPlanner({
  day,
  choices,
  onSave,
  saving,
  onDirtyChange,
}: DayPlannerProps) {
  const baseId = useId();
  const [picks, setPicks] = useState(() => toPicks(choices));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const saved = useMemo(() => toPicks(choices), [choices]);
  const dirty = !samePicks(picks, saved);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function select(key: string, choice: DayChoice) {
    setPicks((current) => new Map(current).set(key, choice));
  }

  function toggle(key: string) {
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
    <>
      {day.meals.map((meal, mealIndex) => (
        <section key={meal.meal} className="plan-sections-meal">
          <h2>{meal.meal}</h2>
          {meal.categories.map((category, categoryIndex) => {
            const key = slotKey(meal.meal, category.category);
            const groupId = `${baseId}-${mealIndex}-${categoryIndex}`;
            const pick = picks.get(key);
            const open = expanded.has(key);
            return (
              <section key={category.category}>
                <h3>
                  <button
                    type="button"
                    className="day-planner-toggle"
                    aria-expanded={open}
                    aria-controls={groupId}
                    onClick={() => toggle(key)}
                  >
                    <span>{category.category}</span>
                    {pick !== undefined ? (
                      <span className="day-planner-pick">{optionLabel(pick)}</span>
                    ) : null}
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
                <div
                  id={groupId}
                  className="day-planner-options"
                  role="radiogroup"
                  aria-label={category.category}
                  hidden={!open}
                >
                  {category.options.map((option) => (
                    <label key={`${option.position}-${option.name}`} className="day-planner-option">
                      <input
                        type="radio"
                        name={groupId}
                        checked={sameValues(pick, option)}
                        onChange={() =>
                          select(key, {
                            meal: meal.meal,
                            category: category.category,
                            name: option.name,
                            amount: option.amount,
                            unit: option.unit,
                          })
                        }
                      />
                      <span>{optionLabel(option)}</span>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </section>
      ))}
      <div className="day-planner-actions">
        <Button
          loading={saving}
          disabled={!dirty || saving}
          onClick={() => onSave(orderedChoices(day, picks))}
        >
          {saving ? t("SAVING") : t("SAVE")}
        </Button>
      </div>
    </>
  );
}
