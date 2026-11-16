import { useState } from "react";

import type { PlanDocument } from "../types/diet-plan";
import { optionLabel } from "../utils/plan";
import DayPicker from "./DayPicker";

import "../styles/plan-sections.css";
import "./DietPlan.css";

export default function DietPlan({ plan }: { plan: PlanDocument }) {
  const [selectedIndex, setDayIndex] = useState(0);
  const dayIndex = selectedIndex < plan.days.length ? selectedIndex : 0;
  const day = plan.days[dayIndex];

  if (day === undefined) {
    return null;
  }

  return (
    <div className="plan-sections diet-plan">
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
