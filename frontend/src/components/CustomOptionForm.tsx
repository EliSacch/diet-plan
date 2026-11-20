import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { t } from "../i18n";
import type { OptionValues } from "../types/day";
import { type OptionFieldError, parseOptionFields, parseUnit } from "../utils/plan";
import Button from "./Button";

import "../styles/option-form.css";

type FieldErrors = { name?: OptionFieldError; amount?: OptionFieldError; unit?: OptionFieldError };

type CustomOptionFormProps = {
  onSubmit: (values: OptionValues) => Promise<void>;
  onCancel: () => void;
};

export default function CustomOptionForm({ onSubmit, onCancel }: CustomOptionFormProps) {
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [nameText, setNameText] = useState("");
  const [amountText, setAmountText] = useState("");
  const [unitText, setUnitText] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (nameRef.current as HTMLInputElement).focus();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = parseOptionFields(nameText, amountText);
    const unit = parseUnit(unitText);
    if (!fields.ok || !unit.ok) {
      setErrors({ ...(fields.ok ? {} : fields.errors), ...(unit.ok ? {} : { unit: unit.error }) });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit({ name: fields.name, amount: fields.amount, unit: unit.unit });
    } catch {
      setSubmitting(false);
    }
  }

  function field(
    key: keyof FieldErrors,
    label: string,
    input: { value: string; onChange: (value: string) => void; type: "text" | "number" },
  ) {
    const error = errors[key];
    const inputId = `${id}-${key}`;
    return (
      <div className="option-form-field">
        <label htmlFor={inputId}>{label}</label>
        <input
          ref={key === "name" ? nameRef : undefined}
          id={inputId}
          type={input.type}
          {...(input.type === "number" ? { inputMode: "decimal", min: "0", step: "any" } : {})}
          value={input.value}
          aria-invalid={error !== undefined}
          aria-describedby={error === undefined ? undefined : `${inputId}-error`}
          onChange={(event) => input.onChange(event.target.value)}
        />
        {error === undefined ? null : (
          <p id={`${inputId}-error`} className="option-form-error">
            {t(error)}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      className="option-form"
      aria-label={t("ADD_CUSTOM_OPTION")}
      noValidate
      onSubmit={(event) => void submit(event)}
    >
      {field("name", t("NAME"), { value: nameText, onChange: setNameText, type: "text" })}
      <div className="option-form-row">
        {field("amount", t("AMOUNT"), {
          value: amountText,
          onChange: setAmountText,
          type: "number",
        })}
        {field("unit", t("UNIT"), { value: unitText, onChange: setUnitText, type: "text" })}
      </div>
      <div className="option-form-actions">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          {t("CANCEL")}
        </Button>
        <Button type="submit" loading={submitting} disabled={submitting}>
          {t("ADD")}
        </Button>
      </div>
    </form>
  );
}
