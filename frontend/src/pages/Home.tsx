import { useState } from "react";

import { dietPlanErrorMessage, useActiveDietPlan } from "../hooks/useActiveDietPlan";
import type { PlanOption } from "../types/diet-plan";

import UploadDietPlan from "../components/UploadDietPlan";

import "./Home.css";

function optionLabel(option: PlanOption) {
  if (option.amount === null) {
    return option.name;
  }
  if (option.unit === null) {
    return `${option.name} ${option.amount}`;
  }
  return `${option.name} ${option.amount} ${option.unit}`;
}

export default function Home() {
  const plan = useActiveDietPlan();
  const [dayIndex, setDayIndex] = useState(0);
  const [mealIndex, setMealIndex] = useState(0);

  if (plan.isPending) {
    return <p>Loading your diet plan…</p>;
  }

  if (plan.isError) {
    return <p role="alert">{dietPlanErrorMessage(plan.error)}</p>;
  }

  if (plan.data === null) {
    return <UploadDietPlan />;
  }

  const day = plan.data.days[dayIndex];
  const meal = day.meals[mealIndex];

  return (
    <div className="diet-plan">
      <div className="diet-plan-switcher" role="group" aria-label="Days">
        {plan.data.days.map((item, index) => (
          <button
            key={item.day}
            type="button"
            aria-pressed={index === dayIndex}
            onClick={() => {
              setDayIndex(index);
              setMealIndex(0);
            }}
          >
            {item.day}
          </button>
        ))}
      </div>
      <div className="diet-plan-switcher" role="group" aria-label="Meals">
        {day.meals.map((item, index) => (
          <button
            key={item.meal}
            type="button"
            aria-pressed={index === mealIndex}
            onClick={() => setMealIndex(index)}
          >
            {item.meal}
          </button>
        ))}
      </div>
      {meal.categories.map((category) => (
        <section key={category.category}>
          <h2>{category.category}</h2>
          <ul>
            {category.options.map((option) => (
              <li key={`${option.position}-${option.name}`}>{optionLabel(option)}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
