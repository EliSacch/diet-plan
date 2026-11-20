import type { PlanOption } from "../types/diet-plan";

// Match MAX_NAME_LENGTH and MAX_AMOUNT in the backend.
export const MAX_NAME_LENGTH = 300;
export const MAX_AMOUNT = 100_000;

export type OptionFieldError = "NAME_REQUIRED" | "NAME_TOO_LONG" | "AMOUNT_INVALID";

export type ParsedOptionFields =
  | { ok: true; name: string; amount: number | null }
  | { ok: false; errors: { name?: OptionFieldError; amount?: OptionFieldError } };

export function optionLabel(option: Pick<PlanOption, "name" | "amount" | "unit">) {
  if (option.amount === null) {
    return option.name;
  }
  if (option.unit === null) {
    return `${option.name} ${option.amount}`;
  }
  return `${option.name} ${option.amount} ${option.unit}`;
}

export function parseOptionFields(nameText: string, amountText: string): ParsedOptionFields {
  const errors: { name?: OptionFieldError; amount?: OptionFieldError } = {};

  const name = nameText.trim();
  if (name === "") {
    errors.name = "NAME_REQUIRED";
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = "NAME_TOO_LONG";
  }

  let amount: number | null = null;
  if (amountText.trim() !== "") {
    amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
      errors.amount = "AMOUNT_INVALID";
    }
  }

  if (errors.name !== undefined || errors.amount !== undefined) {
    return { ok: false, errors };
  }
  return { ok: true, name, amount };
}
