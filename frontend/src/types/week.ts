export type WeekChoice = {
  day: string;
  meal: string;
  category: string;
  name: string;
  amount: number | null;
  unit: string | null;
};

export type Week = {
  week_start: string;
  choices: WeekChoice[];
};
