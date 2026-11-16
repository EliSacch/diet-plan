import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import DayPicker from "./DayPicker";

const days = ["Lunedì", "Martedì", "Mercoledì"];

describe("DayPicker", () => {
  afterEach(() => {
    cleanup();
    setLocale("en");
  });

  it("lists the days in order and shows the selected one", () => {
    render(<DayPicker days={days} value={1} onChange={() => {}} />);

    const select = screen.getByLabelText<HTMLSelectElement>("Day");
    expect(Array.from(select.options, (option) => option.text)).toEqual(days);
    expect(select.value).toBe("1");
    expect(select.selectedOptions[0]?.text).toBe("Martedì");
  });

  it("reports the index of the picked day", () => {
    const onChange = vi.fn();
    render(<DayPicker days={days} value={0} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Day"), { target: { value: "2" } });

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("uses the current locale for the label", () => {
    setLocale("it");

    render(<DayPicker days={days} value={0} onChange={() => {}} />);

    expect(screen.getByLabelText("Giorno")).toBeTruthy();
  });
});
