import { useId, useMemo, useState } from "react";
import { flushSync } from "react-dom";

import { t } from "../i18n";
import type { PlanDay, PlanDocument, PlanOption } from "../types/diet-plan";
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

function firstSlotKey(day: PlanDay) {
  const meal = day.meals[0];
  const category = meal?.categories[0];
  if (meal === undefined || category === undefined) {
    return null;
  }
  return slotKey(day.day, meal.meal, category.category);
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
}: WeekPlannerProps) {
  const baseId = useId();
  const [picks, setPicks] = useState(() => toPicks(choices));
  // undefined opens the day's first category; null means everything is collapsed.
  const [expanded, setExpanded] = useState<string | null | undefined>(undefined);
  const [shownDayIndex, setShownDayIndex] = useState(dayIndex);
  const saved = useMemo(() => toPicks(choices), [choices]);
  const dirty = !samePicks(picks, saved);
  const day = options.days[dayIndex];

  if (shownDayIndex !== dayIndex) {
    setShownDayIndex(dayIndex);
    setExpanded(undefined);
  }

  if (day === undefined) {
    return null;
  }

  const expandedKey = expanded === undefined ? firstSlotKey(day) : expanded;

  function select(key: string, choice: WeekChoice) {
    setPicks((current) => new Map(current).set(key, choice));
  }

  // Collapsing a longer section above can push the opened heading out of view.
  function toggle(key: string, heading: HTMLElement) {
    if (key === expandedKey) {
      setExpanded(null);
      return;
    }
    flushSync(() => setExpanded(key));
    heading.scrollIntoView({ block: "nearest" });
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
            const open = key === expandedKey;
            return (
              <section key={category.category}>
                <h3>
                  <button
                    type="button"
                    className="week-planner-toggle"
                    aria-expanded={open}
                    aria-controls={groupId}
                    onClick={(event) => toggle(key, event.currentTarget)}
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
