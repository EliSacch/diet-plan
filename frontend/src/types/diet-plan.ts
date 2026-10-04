export type PlanOption = {
  name: string;
  amount: number | null;
  unit: string | null;
  position: number;
};

export type PlanCategory = {
  category: string;
  options: PlanOption[];
};

export type PlanMeal = {
  meal: string;
  categories: PlanCategory[];
};

export type PlanDay = {
  day: string;
  meals: PlanMeal[];
};

export type PlanDocument = {
  days: PlanDay[];
};
