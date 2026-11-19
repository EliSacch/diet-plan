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
