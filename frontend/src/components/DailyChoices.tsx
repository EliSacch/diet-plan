import { t } from "../i18n";
import type { DayChoice } from "../types/day";
import type { PlanDay } from "../types/diet-plan";
import { optionLabel } from "../utils/plan";
import Button from "./Button";

import "./DailyChoices.css";

import noData from "../assets/illustrations/no-data.svg";

type DailyChoicesProps = {
  day: PlanDay;
  choices: DayChoice[];
  onPlan: () => void;
};

type MealChoices = {
  meal: string;
  choices: DayChoice[];
};

function slotKey(meal: string, category: string) {
  return `${meal}|${category}`;
}

function mealsForDay(day: PlanDay, choices: DayChoice[]): MealChoices[] {
  const rest = new Map<string, DayChoice[]>();
  for (const choice of choices) {
    const key = slotKey(choice.meal, choice.category);
    rest.set(key, [...(rest.get(key) ?? []), choice]);
  }

  const meals: MealChoices[] = [];
  for (const meal of day.meals) {
    const picked: DayChoice[] = [];
    for (const category of meal.categories) {
      const key = slotKey(meal.meal, category.category);
      const slot = rest.get(key);
      if (slot !== undefined) {
        picked.push(...slot);
        rest.delete(key);
      }
    }
    for (const [key, slot] of rest) {
      if (slot[0]?.meal === meal.meal) {
        picked.push(...slot);
        rest.delete(key);
      }
    }
    if (picked.length > 0) {
      meals.push({ meal: meal.meal, choices: picked });
    }
  }

  const extra = new Map<string, DayChoice[]>();
  for (const slot of rest.values()) {
    const meal = slot[0].meal;
    const list = extra.get(meal);
    if (list === undefined) {
      extra.set(meal, [...slot]);
    } else {
      list.push(...slot);
    }
  }
  for (const [meal, picked] of extra) {
    meals.push({ meal, choices: picked });
  }

  return meals;
}

export default function DailyChoices({ day, choices, onPlan }: DailyChoicesProps) {
  const meals = mealsForDay(day, choices);

  if (meals.length === 0) {
    return (
      <div className="daily-choices daily-choices-empty">
        <p>{t("NO_CHOICES_FOR_DAY")}</p>
        <img className="daily-choices-illustration" src={noData} alt="" width={240} height={234} />
        <Button onClick={onPlan}>{t("PLAN_THIS_DAY")}</Button>
      </div>
    );
  }

  return (
    <div className="daily-choices">
      {meals.map((meal) => (
        <section key={meal.meal} className="daily-choices-meal">
          <h2 className="daily-choices-meal-title">{meal.meal}</h2>
          <ul className="daily-choices-list">
            {meal.choices.map((choice) => (
              <li
                key={`${choice.category}|${choice.name}|${choice.amount}|${choice.unit}`}
                className="daily-choices-item"
              >
                {optionLabel(choice)}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="daily-choices-actions">
        <Button onClick={onPlan}>{t("EDIT")}</Button>
      </div>
    </div>
  );
}
