import { useEffect, useId, useMemo, useState } from "react";

import { t } from "../i18n";
import type { PlanDocument, PlanOption } from "../types/diet-plan";
import type { WeekChoice } from "../types/week";
import { optionLabel } from "../utils/plan";
import Button from "./Button";

import "./WeekPlanner.css";

type OptionValues = Pick<PlanOption, "name" | "amount" | "unit">;

// Renders inside a `.plan-sections` container, under the parent's day picker.
type WeekPlannerProps = {
  options: PlanDocument;
  choices: WeekChoice[];
  dayIndex: number;
  onSave: (choices: WeekChoice[]) => void;
  saving: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

function slotKey(day: string, meal: string, category: string) {
  return `${day}|${meal}|${category}`;
}

function toPicks(choices: WeekChoice[]) {
  return new Map(
    choices.map((choice) => [slotKey(choice.day, choice.meal, choice.category), choice]),
  );
}

function sameValues(a: OptionValues | undefined, b: OptionValues) {
  return a !== undefined && a.name === b.name && a.amount === b.amount && a.unit === b.unit;
}

function samePicks(a: Map<string, WeekChoice>, b: Map<string, WeekChoice>) {
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
function orderedChoices(options: PlanDocument, picks: Map<string, WeekChoice>) {
  const rest = new Map(picks);
  const ordered: WeekChoice[] = [];
  for (const day of options.days) {
    for (const meal of day.meals) {
      for (const category of meal.categories) {
        const key = slotKey(day.day, meal.meal, category.category);
        const choice = rest.get(key);
        if (choice !== undefined) {
          ordered.push(choice);
          rest.delete(key);
        }
      }
    }
  }
  return [...ordered, ...rest.values()];
}

export default function WeekPlanner({
  options,
  choices,
  dayIndex,
  onSave,
  saving,
  onDirtyChange,
}: WeekPlannerProps) {
  const baseId = useId();
  const [picks, setPicks] = useState(() => toPicks(choices));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [shownDayIndex, setShownDayIndex] = useState(dayIndex);
  const saved = useMemo(() => toPicks(choices), [choices]);
  const dirty = !samePicks(picks, saved);
  const day = options.days[dayIndex];

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  if (shownDayIndex !== dayIndex) {
    setShownDayIndex(dayIndex);
    setExpanded(new Set());
  }

  if (day === undefined) {
    return null;
  }

  function select(key: string, choice: WeekChoice) {
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
            const key = slotKey(day.day, meal.meal, category.category);
            const groupId = `${baseId}-${dayIndex}-${mealIndex}-${categoryIndex}`;
            const pick = picks.get(key);
            const open = expanded.has(key);
            return (
              <section key={category.category}>
                <h3>
                  <button
                    type="button"
                    className="week-planner-toggle"
                    aria-expanded={open}
                    aria-controls={groupId}
                    onClick={() => toggle(key)}
                  >
                    <span>{category.category}</span>
                    {pick !== undefined ? (
                      <span className="week-planner-pick">{optionLabel(pick)}</span>
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
                  className="week-planner-options"
                  role="radiogroup"
                  aria-label={category.category}
                  hidden={!open}
                >
                  {category.options.map((option) => (
                    <label
                      key={`${option.position}-${option.name}`}
                      className="week-planner-option"
                    >
                      <input
                        type="radio"
                        name={groupId}
                        checked={sameValues(pick, option)}
                        onChange={() =>
                          select(key, {
                            day: day.day,
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
      <div className="week-planner-actions">
        <Button
          loading={saving}
          disabled={!dirty || saving}
          onClick={() => onSave(orderedChoices(options, picks))}
        >
          {saving ? t("SAVING") : t("SAVE")}
        </Button>
      </div>
    </>
  );
}
