import { useEffect, useId, useMemo, useState } from "react";

import { t } from "../i18n";
import type { CustomOption, CustomOptionInput } from "../types/custom-option";
import type {
  CustomOptionValues,
  DayChoice,
  DayOptions,
  DayOptionsCategory,
  OptionValues,
} from "../types/day";
import { optionLabel } from "../utils/plan";
import Button from "./Button";
import CustomOptionForm from "./CustomOptionForm";
import PickEditor from "./PickEditor";

import "./DayPlanner.css";

// Renders inside a `.plan-sections` container.
type DayPlannerProps = {
  day: DayOptions;
  choices: DayChoice[];
  onSave: (choices: DayChoice[]) => void;
  saving: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onDeleteCustomOption: (option: CustomOptionValues) => void;
  onAddCustomOption: (option: CustomOptionInput) => Promise<CustomOption>;
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

// Picks that match no listed option (an edited saved pick, or a deleted custom option) stay selectable.
function extraOptions(category: DayOptionsCategory, pick: DayChoice | undefined) {
  const listed: OptionValues[] = [...category.options, ...category.custom_options];
  const extras: OptionValues[] = category.current === null ? [] : [category.current];
  if (pick !== undefined && ![...listed, ...extras].some((option) => sameValues(pick, option))) {
    extras.push({ name: pick.name, amount: pick.amount, unit: pick.unit });
  }
  return extras;
}

function CustomOptionIcon() {
  return (
    <svg
      className="day-planner-custom-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={t("CUSTOM_OPTION")}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// Saved picks whose slot is no longer in the plan are sent back so a save doesn't drop them.
function orderedChoices(day: DayOptions, picks: Map<string, DayChoice>) {
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
  onDeleteCustomOption,
  onAddCustomOption,
}: DayPlannerProps) {
  const baseId = useId();
  const [picks, setPicks] = useState(() => toPicks(choices));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const saved = useMemo(() => toPicks(choices), [choices]);
  const dirty = !samePicks(picks, saved);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function select(key: string, choice: DayChoice) {
    setPicks((current) => new Map(current).set(key, choice));
    setEditing(null);
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
            const choose = (option: OptionValues) =>
              select(key, {
                meal: meal.meal,
                category: category.category,
                name: option.name,
                amount: option.amount,
                unit: option.unit,
              });
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
                        onChange={() => choose(option)}
                      />
                      <span>{optionLabel(option)}</span>
                    </label>
                  ))}
                  {category.custom_options.map((option) => (
                    <div key={`custom-${option.id}`} className="day-planner-option-row">
                      <label className="day-planner-option">
                        <input
                          type="radio"
                          name={groupId}
                          checked={sameValues(pick, option)}
                          onChange={() => choose(option)}
                        />
                        <span>{optionLabel(option)}</span> <CustomOptionIcon />
                      </label>
                      <button
                        type="button"
                        className="day-planner-delete"
                        aria-label={`${t("DELETE")} ${optionLabel(option)}`}
                        onClick={() => onDeleteCustomOption(option)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                  {extraOptions(category, pick).map((option) => (
                    <label key={`extra-${optionLabel(option)}`} className="day-planner-option">
                      <input
                        type="radio"
                        name={groupId}
                        checked={sameValues(pick, option)}
                        onChange={() => choose(option)}
                      />
                      <span>{optionLabel(option)}</span>
                    </label>
                  ))}
                  {pick !== undefined && editing === key ? (
                    <PickEditor
                      pick={pick}
                      onApply={(values) => choose({ ...pick, ...values })}
                      onCancel={() => setEditing(null)}
                    />
                  ) : null}
                  {adding === key ? (
                    <CustomOptionForm
                      onSubmit={async (values) => {
                        const created = await onAddCustomOption({
                          meal: meal.meal,
                          category: category.category,
                          ...values,
                        });
                        choose(created);
                        setAdding(null);
                      }}
                      onCancel={() => setAdding(null)}
                    />
                  ) : null}
                  {pick !== undefined && editing !== key ? (
                    <button
                      type="button"
                      className="day-planner-edit"
                      onClick={() => {
                        setEditing(key);
                        setAdding(null);
                      }}
                    >
                      <PencilIcon />
                      <span>{t("EDIT_PICK")}</span>
                    </button>
                  ) : null}
                  {adding !== key ? (
                    <button
                      type="button"
                      className="day-planner-edit"
                      onClick={() => {
                        setAdding(key);
                        setEditing(null);
                      }}
                    >
                      <PlusIcon />
                      <span>{t("ADD_CUSTOM_OPTION")}</span>
                    </button>
                  ) : null}
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
