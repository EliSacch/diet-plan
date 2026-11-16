import type { PlanOption } from "../types/diet-plan";

export function optionLabel(option: Pick<PlanOption, "name" | "amount" | "unit">) {
  if (option.amount === null) {
    return option.name;
  }
  if (option.unit === null) {
    return `${option.name} ${option.amount}`;
  }
  return `${option.name} ${option.amount} ${option.unit}`;
}
