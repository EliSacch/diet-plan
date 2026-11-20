import type { PlanOption } from "./diet-plan";

export type DayChoice = {
  meal: string;
  category: string;
  name: string;
  amount: number | null;
  unit: string | null;
};

export type Day = {
  date: string;
  choices: DayChoice[];
};

export type OptionValues = Pick<PlanOption, "name" | "amount" | "unit">;

export type CustomOptionValues = OptionValues & {
  id: number;
};

export type DayOptionsCategory = {
  category: string;
  options: PlanOption[];
  custom_options: CustomOptionValues[];
  current: OptionValues[];
  multi_select: boolean;
};

export type DayOptionsMeal = {
  meal: string;
  categories: DayOptionsCategory[];
};

export type DayOptions = {
  day: string;
  meals: DayOptionsMeal[];
};
