import { t } from "../i18n";
import type { PlanDay } from "../types/diet-plan";
import type { WeekChoice } from "../types/week";
import { optionLabel } from "../utils/plan";
import Button from "./Button";

import "./DailyChoices.css";

type DailyChoicesProps = {
  day: PlanDay;
  choices: WeekChoice[];
  onPlan: () => void;
};

type MealChoices = {
  meal: string;
  choices: WeekChoice[];
};

function slotKey(meal: string, category: string) {
  return `${meal}|${category}`;
}

function mealsForDay(day: PlanDay, choices: WeekChoice[]): MealChoices[] {
  const rest = new Map<string, WeekChoice>();
  for (const choice of choices) {
    if (choice.day === day.day) {
      rest.set(slotKey(choice.meal, choice.category), choice);
    }
  }

  const meals: MealChoices[] = [];
  for (const meal of day.meals) {
    const picked: WeekChoice[] = [];
    for (const category of meal.categories) {
      const key = slotKey(meal.meal, category.category);
      const choice = rest.get(key);
      if (choice !== undefined) {
        picked.push(choice);
        rest.delete(key);
      }
    }
    for (const [key, choice] of rest) {
      if (choice.meal === meal.meal) {
        picked.push(choice);
        rest.delete(key);
      }
    }
    if (picked.length > 0) {
      meals.push({ meal: meal.meal, choices: picked });
    }
  }

  const extra = new Map<string, WeekChoice[]>();
  for (const choice of rest.values()) {
    const list = extra.get(choice.meal);
    if (list === undefined) {
      extra.set(choice.meal, [choice]);
    } else {
      list.push(choice);
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
        <Button onClick={onPlan}>{t("PLAN_THIS_WEEK")}</Button>
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
              <li key={choice.category} className="daily-choices-item">
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
