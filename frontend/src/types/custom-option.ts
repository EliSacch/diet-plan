export type CustomOptionInput = {
  meal: string;
  category: string;
  name: string;
  amount: number | null;
  unit: string | null;
};

export type CustomOption = CustomOptionInput & {
  id: number;
};
