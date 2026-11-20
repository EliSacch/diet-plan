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
  onMultiSelectChange?: (category: string, multiSelect: boolean) => void;
};

type Editing = { key: string; target: OptionValues };

function slotKey(meal: string, category: string) {
  return `${meal}|${category}`;
}

function toPicks(choices: DayChoice[]) {
  const picks = new Map<string, DayChoice[]>();
  for (const choice of choices) {
    const key = slotKey(choice.meal, choice.category);
    picks.set(key, [...(picks.get(key) ?? []), choice]);
  }
  return picks;
}

function sameValues(a: OptionValues | undefined, b: OptionValues) {
  return a !== undefined && a.name === b.name && a.amount === b.amount && a.unit === b.unit;
}

function includesValues(list: OptionValues[], option: OptionValues) {
  return list.some((entry) => sameValues(entry, option));
}

function samePicks(a: Map<string, DayChoice[]>, b: Map<string, DayChoice[]>) {
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const key of keys) {
    const left = a.get(key) ?? [];
    const right = b.get(key) ?? [];
    if (left.length !== right.length || !left.every((choice) => includesValues(right, choice))) {
      return false;
    }
  }
  return true;
}

// Picks that match no listed option (an edited saved pick, or a deleted custom option) stay selectable.
function extraOptions(category: DayOptionsCategory, picked: DayChoice[]) {
  const extras: OptionValues[] = [];
  const listed: OptionValues[] = [...category.options, ...category.custom_options];
  for (const option of [...category.current, ...picked]) {
    if (!includesValues([...listed, ...extras], option)) {
      extras.push({ name: option.name, amount: option.amount, unit: option.unit });
    }
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
function orderedChoices(day: DayOptions, picks: Map<string, DayChoice[]>) {
  const rest = new Map(picks);
  const ordered: DayChoice[] = [];
  for (const meal of day.meals) {
    for (const category of meal.categories) {
      const key = slotKey(meal.meal, category.category);
      ordered.push(...(rest.get(key) ?? []));
      rest.delete(key);
    }
  }
  return [...ordered, ...[...rest.values()].flat()];
}

export default function DayPlanner({
  day,
  choices,
  onSave,
  saving,
  onDirtyChange,
  onDeleteCustomOption,
  onAddCustomOption,
  onMultiSelectChange,
}: DayPlannerProps) {
  const baseId = useId();
  const [picks, setPicks] = useState(() => toPicks(choices));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [editing, setEditing] = useState<Editing | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const saved = useMemo(() => toPicks(choices), [choices]);
  const dirty = !samePicks(picks, saved);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function setSlot(key: string, update: (picked: DayChoice[]) => DayChoice[]) {
    setPicks((current) => {
      const next = new Map(current);
      const picked = update(current.get(key) ?? []);
      if (picked.length === 0) {
        next.delete(key);
      } else {
        next.set(key, picked);
      }
      return next;
    });
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
            const picked = picks.get(key) ?? [];
            const open = expanded.has(key);
            const multi = category.multi_select;
            const checkboxes = multi || picked.length > 1;
            const toChoice = (option: OptionValues): DayChoice => ({
              meal: meal.meal,
              category: category.category,
              name: option.name,
              amount: option.amount,
              unit: option.unit,
            });
            const choose = (option: OptionValues) =>
              setSlot(key, (current) => {
                if (includesValues(current, option)) {
                  return current;
                }
                return multi ? [...current, toChoice(option)] : [toChoice(option)];
              });
            const pickToggle = (option: OptionValues) =>
              setSlot(key, (current) =>
                includesValues(current, option)
                  ? current.filter((choice) => !sameValues(choice, option))
                  : multi
                    ? [...current, toChoice(option)]
                    : [toChoice(option)],
              );
            const replace = (target: OptionValues, values: OptionValues) =>
              setSlot(key, (current) => {
                const others = current.filter((choice) => !sameValues(choice, target));
                return includesValues(others, values)
                  ? others
                  : current.map((choice) =>
                      sameValues(choice, target) ? toChoice(values) : choice,
                    );
              });
            const optionInput = (option: OptionValues) => {
              const checked = includesValues(picked, option);
              return (
                <input
                  type={checkboxes ? "checkbox" : "radio"}
                  name={groupId}
                  checked={checked}
                  onChange={() => pickToggle(option)}
                  // A checked radio fires no change event, so clicking it again clears it here.
                  onClick={!checkboxes && checked ? () => pickToggle(option) : undefined}
                />
              );
            };
            const editButton = (option: OptionValues) =>
              picked.length > 1 && includesValues(picked, option) ? (
                <button
                  type="button"
                  className="day-planner-row-edit"
                  aria-label={`${t("EDIT_PICK")} ${optionLabel(option)}`}
                  onClick={() => {
                    setEditing({ key, target: option });
                    setAdding(null);
                  }}
                >
                  <PencilIcon />
                </button>
              ) : null;
            return (
              <section key={category.category}>
                <h3 className="day-planner-heading">
                  <button
                    type="button"
                    className="day-planner-toggle"
                    aria-expanded={open}
                    aria-controls={groupId}
                    onClick={() => toggle(key)}
                  >
                    <span>{category.category}</span>
                    {picked.length > 0 ? (
                      <span className="day-planner-pick">
                        {picked.map((choice) => optionLabel(choice)).join(", ")}
                      </span>
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
                  <label className="day-planner-multi" title={t("ALLOW_MULTIPLE_CHOICES")}>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={multi}
                      aria-label={`${t("ALLOW_MULTIPLE_CHOICES")}: ${category.category}`}
                      onChange={(event) =>
                        onMultiSelectChange?.(category.category, event.target.checked)
                      }
                    />
                    <span aria-hidden="true">{t("MULTIPLE")}</span>
                  </label>
                </h3>
                <div
                  id={groupId}
                  className="day-planner-options"
                  role={checkboxes ? "group" : "radiogroup"}
                  aria-label={category.category}
                  hidden={!open}
                >
                  {category.options.map((option) => (
                    <div
                      key={`${option.position}-${option.name}`}
                      className="day-planner-option-row"
                    >
                      <label className="day-planner-option">
                        {optionInput(option)}
                        <span>{optionLabel(option)}</span>
                      </label>
                      {editButton(option)}
                    </div>
                  ))}
                  {category.custom_options.map((option) => (
                    <div key={`custom-${option.id}`} className="day-planner-option-row">
                      <label className="day-planner-option">
                        {optionInput(option)}
                        <span>{optionLabel(option)}</span> <CustomOptionIcon />
                      </label>
                      {editButton(option)}
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
                  {extraOptions(category, picked).map((option) => (
                    <div key={`extra-${optionLabel(option)}`} className="day-planner-option-row">
                      <label className="day-planner-option">
                        {optionInput(option)}
                        <span>{optionLabel(option)}</span>
                      </label>
                      {editButton(option)}
                    </div>
                  ))}
                  {editing !== null && editing.key === key ? (
                    <PickEditor
                      key={optionLabel(editing.target)}
                      pick={editing.target}
                      onApply={(values) =>
                        replace(editing.target, { ...editing.target, ...values })
                      }
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
                  {picked.length === 1 && editing?.key !== key ? (
                    <button
                      type="button"
                      className="day-planner-edit"
                      onClick={() => {
                        setEditing({ key, target: picked[0] });
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
