import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { t } from "../i18n";
import type { OptionValues } from "../types/day";
import { type OptionFieldError, parseOptionFields } from "../utils/plan";
import Button from "./Button";

import "./PickEditor.css";

type PickEditorProps = {
  pick: OptionValues;
  onApply: (values: Pick<OptionValues, "name" | "amount">) => void;
  onCancel: () => void;
};

export default function PickEditor({ pick, onApply, onCancel }: PickEditorProps) {
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [nameText, setNameText] = useState(pick.name);
  const [amountText, setAmountText] = useState(pick.amount === null ? "" : String(pick.amount));
  const [errors, setErrors] = useState<{ name?: OptionFieldError; amount?: OptionFieldError }>({});

  useEffect(() => {
    (nameRef.current as HTMLInputElement).focus();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseOptionFields(nameText, amountText);
    if (parsed.ok) {
      onApply({ name: parsed.name, amount: parsed.amount });
    } else {
      setErrors(parsed.errors);
    }
  }

  return (
    <form className="pick-editor" aria-label={t("EDIT_PICK")} noValidate onSubmit={submit}>
      <div className="pick-editor-field">
        <label htmlFor={`${id}-name`}>{t("NAME")}</label>
        <input
          ref={nameRef}
          id={`${id}-name`}
          type="text"
          value={nameText}
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name === undefined ? undefined : `${id}-name-error`}
          onChange={(event) => setNameText(event.target.value)}
        />
        {errors.name === undefined ? null : (
          <p id={`${id}-name-error`} className="pick-editor-error">
            {t(errors.name)}
          </p>
        )}
      </div>
      <div className="pick-editor-field">
        <label htmlFor={`${id}-amount`}>{t("AMOUNT")}</label>
        <div className="pick-editor-amount">
          <input
            id={`${id}-amount`}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={amountText}
            aria-invalid={errors.amount !== undefined}
            aria-describedby={errors.amount === undefined ? undefined : `${id}-amount-error`}
            onChange={(event) => setAmountText(event.target.value)}
          />
          {pick.unit === null ? null : <span className="pick-editor-unit">{pick.unit}</span>}
        </div>
        {errors.amount === undefined ? null : (
          <p id={`${id}-amount-error`} className="pick-editor-error">
            {t(errors.amount)}
          </p>
        )}
      </div>
      <div className="pick-editor-actions">
        <Button variant="secondary" onClick={onCancel}>
          {t("CANCEL")}
        </Button>
        <Button type="submit">{t("APPLY")}</Button>
      </div>
    </form>
  );
}
