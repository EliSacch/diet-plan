import type { ComponentProps } from "react";

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setLocale } from "../i18n";
import type { CustomOption } from "../types/custom-option";
import type { CustomOptionValues, DayChoice, DayOptions, OptionValues } from "../types/day";
import DayPlanner from "./DayPlanner";

import { it as italian } from "../i18n/locales/it";

const farro: CustomOptionValues = { id: 7, name: "Pasta di farro", amount: 70, unit: "g" };

function mondayWith({
  custom_options = [],
  current = null,
}: { custom_options?: CustomOptionValues[]; current?: OptionValues | null } = {}): DayOptions {
  return {
    day: "Lunedì",
    meals: [
      {
        meal: "Pranzo",
        categories: [
          {
            category: "Primi",
            options: [
              { name: "Pasta", amount: 80, unit: "g", position: 0 },
              { name: "Pasta", amount: 100, unit: "g", position: 1 },
              { name: "Riso", amount: 70, unit: "g", position: 2 },
            ],
            custom_options,
            current,
          },
          {
            category: "Contorni",
            options: [{ name: "Insalata mista", amount: null, unit: null, position: 0 }],
            custom_options: [],
            current: null,
          },
        ],
      },
    ],
  };
}

const monday = mondayWith();

const farroChoice: DayChoice = {
  meal: "Pranzo",
  category: "Primi",
  name: "Pasta di farro",
  amount: 70,
  unit: "g",
};

const pasta80: DayChoice = {
  meal: "Pranzo",
  category: "Primi",
  name: "Pasta",
  amount: 80,
  unit: "g",
};

const insalata: DayChoice = {
  meal: "Pranzo",
  category: "Contorni",
  name: "Insalata mista",
  amount: null,
  unit: null,
};

type PlannerProps = ComponentProps<typeof DayPlanner>;

let updatePlanner: (changes: Partial<PlannerProps>) => void;

function renderPlanner(initial: Partial<PlannerProps> = {}) {
  const onSave = vi.fn();
  const onDeleteCustomOption = vi.fn();
  const onAddCustomOption = vi.fn<PlannerProps["onAddCustomOption"]>();
  let props: PlannerProps = {
    day: monday,
    choices: [],
    onSave,
    saving: false,
    onDeleteCustomOption,
    onAddCustomOption,
    ...initial,
  };
  const rendered = render(<DayPlanner {...props} />);
  updatePlanner = (changes) => {
    props = { ...props, ...changes };
    rendered.rerender(<DayPlanner {...props} />);
  };
  return { onSave, onDeleteCustomOption, onAddCustomOption, ...rendered };
}

function group(name: string) {
  return within(screen.getByRole("radiogroup", { name }));
}

function radio(groupName: string, label: string) {
  return group(groupName).getByRole<HTMLInputElement>("radio", { name: label });
}

function toggle(category: string) {
  return screen.getByRole<HTMLButtonElement>("button", { name: new RegExp(`^${category}`) });
}

function saveButton() {
  return screen.getByRole<HTMLButtonElement>("button", { name: "Save" });
}

describe("DayPlanner", () => {
  afterEach(() => {
    cleanup();
    setLocale("en");
  });

  it("shows the day with all categories collapsed and nothing picked", () => {
    renderPlanner();

    expect(screen.getByRole("heading", { level: 2, name: "Pranzo" })).toBeTruthy();
    expect(toggle("Primi").getAttribute("aria-expanded")).toBe("false");
    expect(toggle("Contorni").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(saveButton().disabled).toBe(true);
  });

  it("expands multiple categories independently without auto-collapsing others", () => {
    renderPlanner();

    fireEvent.click(toggle("Primi"));
    expect(toggle("Primi").getAttribute("aria-expanded")).toBe("true");
    expect(group("Primi").getAllByRole("radio")).toHaveLength(3);
    expect(toggle("Contorni").getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle("Contorni"));
    expect(toggle("Primi").getAttribute("aria-expanded")).toBe("true");
    expect(toggle("Contorni").getAttribute("aria-expanded")).toBe("true");
    expect(radio("Contorni", "Insalata mista")).toBeTruthy();

    fireEvent.click(toggle("Primi"));
    expect(toggle("Primi").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("radiogroup", { name: "Primi" })).toBeNull();
    expect(toggle("Contorni").getAttribute("aria-expanded")).toBe("true");
  });

  it("shows the pick in a collapsed heading", () => {
    renderPlanner({ choices: [pasta80] });

    expect(toggle("Primi").textContent).toBe("PrimiPasta 80 g");
    expect(toggle("Contorni").textContent).toBe("Contorni");
  });

  it.each([
    ["no meals", []],
    ["a meal without categories", [{ meal: "Pranzo", categories: [] }]],
  ])("handles a day with %s", (_label, meals) => {
    renderPlanner({ day: { day: "Lunedì", meals } });

    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(saveButton().disabled).toBe(true);
  });

  it("saves picks in plan order", () => {
    const { onSave } = renderPlanner();

    fireEvent.click(toggle("Contorni"));
    fireEvent.click(radio("Contorni", "Insalata mista"));
    fireEvent.click(toggle("Primi"));
    fireEvent.click(radio("Primi", "Riso 70 g"));
    fireEvent.click(radio("Primi", "Pasta 80 g"));

    expect(radio("Primi", "Pasta 80 g").checked).toBe(true);
    expect(radio("Primi", "Riso 70 g").checked).toBe(false);

    fireEvent.click(saveButton());

    expect(onSave).toHaveBeenCalledWith([pasta80, insalata]);
  });

  it("preselects saved choices by name, amount and unit", () => {
    renderPlanner({ choices: [pasta80] });

    fireEvent.click(toggle("Primi"));

    expect(radio("Primi", "Pasta 80 g").checked).toBe(true);
    expect(radio("Primi", "Pasta 100 g").checked).toBe(false);
    expect(saveButton().disabled).toBe(true);
  });

  it("enables Save only while the picks differ from the saved day", () => {
    renderPlanner({ choices: [pasta80] });

    fireEvent.click(toggle("Primi"));
    fireEvent.click(radio("Primi", "Riso 70 g"));
    expect(saveButton().disabled).toBe(false);

    fireEvent.click(radio("Primi", "Pasta 80 g"));
    expect(saveButton().disabled).toBe(true);

    fireEvent.click(toggle("Contorni"));
    fireEvent.click(radio("Contorni", "Insalata mista"));
    expect(saveButton().disabled).toBe(false);
  });

  it("disables Save once the saved day catches up with the picks", () => {
    renderPlanner();

    fireEvent.click(toggle("Primi"));
    fireEvent.click(radio("Primi", "Pasta 80 g"));
    fireEvent.click(saveButton());
    updatePlanner({ choices: [pasta80] });

    expect(radio("Primi", "Pasta 80 g").checked).toBe(true);
    expect(saveButton().disabled).toBe(true);
  });

  it("keeps saved picks that are no longer in the plan when saving", () => {
    const removed: DayChoice = {
      meal: "Cena",
      category: "Pizza",
      name: "Margherita",
      amount: 1,
      unit: null,
    };
    const { onSave } = renderPlanner({ choices: [removed] });

    fireEvent.click(toggle("Primi"));
    fireEvent.click(radio("Primi", "Pasta 80 g"));
    fireEvent.click(saveButton());

    expect(onSave).toHaveBeenCalledWith([pasta80, removed]);
  });

  it("shows a busy, disabled button while saving", () => {
    renderPlanner({ choices: [pasta80], saving: true });

    fireEvent.click(toggle("Primi"));
    fireEvent.click(radio("Primi", "Riso 70 g"));

    const button = screen.getByRole<HTMLButtonElement>("button", { name: "Saving…" });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("lists custom options after the diet options, marked with an icon", () => {
    renderPlanner({ day: mondayWith({ custom_options: [farro] }) });

    fireEvent.click(toggle("Primi"));

    const names = group("Primi")
      .getAllByRole("radio")
      .map((input) => input.closest("label")?.textContent?.trim());
    expect(names).toEqual(["Pasta 80 g", "Pasta 100 g", "Riso 70 g", "Pasta di farro 70 g"]);
    const icons = group("Primi").getAllByRole("img", { name: "Custom option" });
    expect(icons).toHaveLength(1);
    expect(radio("Primi", "Pasta di farro 70 g Custom option")).toBeTruthy();
  });

  it("selects a custom option like any option and saves its values", () => {
    const { onSave } = renderPlanner({ day: mondayWith({ custom_options: [farro] }) });

    fireEvent.click(toggle("Primi"));
    fireEvent.click(radio("Primi", "Pasta di farro 70 g Custom option"));

    expect(radio("Primi", "Pasta di farro 70 g Custom option").checked).toBe(true);
    expect(toggle("Primi").textContent).toBe("PrimiPasta di farro 70 g");
    expect(saveButton().disabled).toBe(false);

    fireEvent.click(saveButton());
    expect(onSave).toHaveBeenCalledWith([farroChoice]);
  });

  it("preselects a saved custom option", () => {
    renderPlanner({ day: mondayWith({ custom_options: [farro] }), choices: [farroChoice] });

    fireEvent.click(toggle("Primi"));

    expect(radio("Primi", "Pasta di farro 70 g Custom option").checked).toBe(true);
    expect(saveButton().disabled).toBe(true);
  });

  it("asks to delete a custom option without changing the picks", () => {
    const { onDeleteCustomOption } = renderPlanner({
      day: mondayWith({ custom_options: [farro] }),
    });

    fireEvent.click(toggle("Primi"));
    fireEvent.click(group("Primi").getByRole("button", { name: "Delete Pasta di farro 70 g" }));

    expect(onDeleteCustomOption).toHaveBeenCalledWith(farro);
    expect(radio("Primi", "Pasta di farro 70 g Custom option").checked).toBe(false);
    expect(saveButton().disabled).toBe(true);
  });

  it("offers delete only on custom options", () => {
    renderPlanner({ day: mondayWith({ custom_options: [farro] }) });

    fireEvent.click(toggle("Primi"));

    expect(group("Primi").getAllByRole("button", { name: /^Delete/ })).toHaveLength(1);
  });

  it("shows the current saved pick as an extra selected entry", () => {
    const edited: DayChoice = { ...pasta80, amount: 90 };
    const current = { name: "Pasta", amount: 90, unit: "g" };
    renderPlanner({ day: mondayWith({ current }), choices: [edited] });

    fireEvent.click(toggle("Primi"));

    expect(group("Primi").getAllByRole("radio")).toHaveLength(4);
    expect(radio("Primi", "Pasta 90 g").checked).toBe(true);
    expect(saveButton().disabled).toBe(true);

    fireEvent.click(radio("Primi", "Riso 70 g"));
    expect(radio("Primi", "Pasta 90 g").checked).toBe(false);
    expect(saveButton().disabled).toBe(false);

    fireEvent.click(radio("Primi", "Pasta 90 g"));
    expect(radio("Primi", "Pasta 90 g").checked).toBe(true);
    expect(saveButton().disabled).toBe(true);
  });

  it("keeps a pick whose custom option is no longer listed", () => {
    const { onSave } = renderPlanner({
      day: mondayWith({ custom_options: [farro] }),
      choices: [pasta80],
    });

    fireEvent.click(toggle("Primi"));
    fireEvent.click(radio("Primi", "Pasta di farro 70 g Custom option"));
    updatePlanner({ day: mondayWith() });

    expect(radio("Primi", "Pasta di farro 70 g").checked).toBe(true);
    expect(group("Primi").queryByRole("img")).toBeNull();

    fireEvent.click(saveButton());
    expect(onSave).toHaveBeenCalledWith([farroChoice]);
  });

  it("shows the current saved pick once when it is also the pick", () => {
    renderPlanner({ day: mondayWith({ current: farro }), choices: [farroChoice] });

    fireEvent.click(toggle("Primi"));

    expect(group("Primi").getAllByRole("radio", { name: "Pasta di farro 70 g" })).toHaveLength(1);
  });

  it("labels custom options in the current locale", () => {
    setLocale("it");
    renderPlanner({ day: mondayWith({ custom_options: [farro] }) });

    fireEvent.click(toggle("Primi"));

    expect(group("Primi").getByRole("img", { name: italian.labels.CUSTOM_OPTION })).toBeTruthy();
    expect(
      group("Primi").getByRole("button", {
        name: `${italian.labels.DELETE} Pasta di farro 70 g`,
      }),
    ).toBeTruthy();
  });

  it("offers to edit only a category that has a pick", () => {
    renderPlanner({ choices: [pasta80] });

    fireEvent.click(toggle("Primi"));
    fireEvent.click(toggle("Contorni"));

    expect(group("Primi").getByRole("button", { name: "Edit selection" })).toBeTruthy();
    expect(group("Contorni").queryByRole("button", { name: "Edit selection" })).toBeNull();
  });

  it("saves an edited amount as the pick", () => {
    const { onSave } = renderPlanner({ choices: [pasta80] });

    fireEvent.click(toggle("Primi"));
    fireEvent.click(group("Primi").getByRole("button", { name: "Edit selection" }));
    fireEvent.change(group("Primi").getByRole("spinbutton", { name: "Amount" }), {
      target: { value: "90" },
    });
    fireEvent.click(group("Primi").getByRole("button", { name: "Apply" }));

    expect(group("Primi").queryByRole("form")).toBeNull();
    expect(radio("Primi", "Pasta 90 g").checked).toBe(true);
    expect(radio("Primi", "Pasta 80 g").checked).toBe(false);
    expect(toggle("Primi").textContent).toBe("PrimiPasta 90 g");
    expect(saveButton().disabled).toBe(false);

    fireEvent.click(saveButton());
    expect(onSave).toHaveBeenCalledWith([{ ...pasta80, amount: 90 }]);
  });

  it("saves an edited name and keeps the amount and unit", () => {
    const { onSave } = renderPlanner({ choices: [pasta80, insalata] });

    fireEvent.click(toggle("Primi"));
    fireEvent.click(group("Primi").getByRole("button", { name: "Edit selection" }));
    fireEvent.change(group("Primi").getByRole("textbox", { name: "Name" }), {
      target: { value: "Pasta integrale" },
    });
    fireEvent.click(group("Primi").getByRole("button", { name: "Apply" }));
    fireEvent.click(saveButton());

    expect(onSave).toHaveBeenCalledWith([{ ...pasta80, name: "Pasta integrale" }, insalata]);
  });

  it("keeps the pick while the edit has errors", () => {
    renderPlanner({ choices: [pasta80] });

    fireEvent.click(toggle("Primi"));
    fireEvent.click(group("Primi").getByRole("button", { name: "Edit selection" }));
    fireEvent.change(group("Primi").getByRole("spinbutton", { name: "Amount" }), {
      target: { value: "-1" },
    });
    fireEvent.click(group("Primi").getByRole("button", { name: "Apply" }));

    expect(
      group("Primi").getByText("Enter an amount greater than 0 and up to 100,000."),
    ).toBeTruthy();
    expect(radio("Primi", "Pasta 80 g").checked).toBe(true);
    expect(saveButton().disabled).toBe(true);
  });

  it("closes the edit without changes on cancel or when another option is picked", () => {
    renderPlanner({ choices: [pasta80] });

    fireEvent.click(toggle("Primi"));
    fireEvent.click(group("Primi").getByRole("button", { name: "Edit selection" }));
    fireEvent.change(group("Primi").getByRole("spinbutton", { name: "Amount" }), {
      target: { value: "90" },
    });
    fireEvent.click(group("Primi").getByRole("button", { name: "Cancel" }));

    expect(group("Primi").queryByRole("form")).toBeNull();
    expect(radio("Primi", "Pasta 80 g").checked).toBe(true);
    expect(saveButton().disabled).toBe(true);

    fireEvent.click(group("Primi").getByRole("button", { name: "Edit selection" }));
    fireEvent.click(radio("Primi", "Riso 70 g"));

    expect(group("Primi").queryByRole("form")).toBeNull();
    expect(radio("Primi", "Riso 70 g").checked).toBe(true);
  });

  it("starts a new edit from the current pick", () => {
    renderPlanner({ choices: [pasta80] });

    fireEvent.click(toggle("Primi"));
    fireEvent.click(group("Primi").getByRole("button", { name: "Edit selection" }));
    fireEvent.change(group("Primi").getByRole("spinbutton", { name: "Amount" }), {
      target: { value: "90" },
    });
    fireEvent.click(group("Primi").getByRole("button", { name: "Apply" }));
    fireEvent.click(group("Primi").getByRole("button", { name: "Edit selection" }));

    expect(group("Primi").getByRole<HTMLInputElement>("spinbutton", { name: "Amount" }).value).toBe(
      "90",
    );
  });

  it("selects the existing option when an edit matches it", () => {
    renderPlanner({ choices: [pasta80] });

    fireEvent.click(toggle("Primi"));
    fireEvent.click(group("Primi").getByRole("button", { name: "Edit selection" }));
    fireEvent.change(group("Primi").getByRole("spinbutton", { name: "Amount" }), {
      target: { value: "100" },
    });
    fireEvent.click(group("Primi").getByRole("button", { name: "Apply" }));

    expect(group("Primi").getAllByRole("radio")).toHaveLength(3);
    expect(radio("Primi", "Pasta 100 g").checked).toBe(true);
  });

  it("offers to add a custom option in every category", () => {
    renderPlanner();

    fireEvent.click(toggle("Primi"));
    fireEvent.click(toggle("Contorni"));

    expect(group("Primi").getByRole("button", { name: "Add custom option" })).toBeTruthy();
    expect(group("Contorni").getByRole("button", { name: "Add custom option" })).toBeTruthy();
  });

  it("adds a custom option to the category and selects it", async () => {
    const created: CustomOption = { id: 9, ...farroChoice };
    const { onAddCustomOption, onSave } = renderPlanner({ choices: [pasta80] });
    onAddCustomOption.mockResolvedValue(created);

    fireEvent.click(toggle("Primi"));
    fireEvent.click(group("Primi").getByRole("button", { name: "Add custom option" }));
    expect(group("Primi").queryByRole("button", { name: "Add custom option" })).toBeNull();
    fireEvent.change(group("Primi").getByLabelText("Name"), {
      target: { value: "Pasta di farro" },
    });
    fireEvent.change(group("Primi").getByLabelText("Amount"), { target: { value: "70" } });
    fireEvent.change(group("Primi").getByLabelText("Unit"), { target: { value: "g" } });
    await act(async () => {
      fireEvent.click(group("Primi").getByRole("button", { name: "Add" }));
    });

    expect(onAddCustomOption).toHaveBeenCalledWith({
      meal: "Pranzo",
      category: "Primi",
      name: "Pasta di farro",
      amount: 70,
      unit: "g",
    });
    expect(group("Primi").queryByRole("form")).toBeNull();
    expect(radio("Primi", "Pasta di farro 70 g").checked).toBe(true);

    updatePlanner({ day: mondayWith({ custom_options: [created] }) });
    expect(radio("Primi", "Pasta di farro 70 g Custom option").checked).toBe(true);

    fireEvent.click(saveButton());
    expect(onSave).toHaveBeenCalledWith([farroChoice]);
  });

  it("keeps the form open when adding fails", async () => {
    const { onAddCustomOption } = renderPlanner();
    onAddCustomOption.mockRejectedValue(new Error("conflict"));

    fireEvent.click(toggle("Primi"));
    fireEvent.click(group("Primi").getByRole("button", { name: "Add custom option" }));
    fireEvent.change(group("Primi").getByLabelText("Name"), { target: { value: "Pasta" } });
    fireEvent.change(group("Primi").getByLabelText("Amount"), { target: { value: "80" } });
    fireEvent.change(group("Primi").getByLabelText("Unit"), { target: { value: "g" } });
    await act(async () => {
      fireEvent.click(group("Primi").getByRole("button", { name: "Add" }));
    });

    expect(group("Primi").getByRole("form", { name: "Add custom option" })).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
  });

  it("shows one form at a time between editing and adding", () => {
    renderPlanner({ choices: [pasta80] });

    fireEvent.click(toggle("Primi"));
    fireEvent.click(group("Primi").getByRole("button", { name: "Edit selection" }));
    fireEvent.click(group("Primi").getByRole("button", { name: "Add custom option" }));

    expect(group("Primi").getAllByRole("form")).toHaveLength(1);
    expect(group("Primi").getByRole("form", { name: "Add custom option" })).toBeTruthy();

    fireEvent.click(group("Primi").getByRole("button", { name: "Edit selection" }));
    expect(group("Primi").getAllByRole("form")).toHaveLength(1);
    expect(group("Primi").getByRole("form", { name: "Edit selection" })).toBeTruthy();
    expect(group("Primi").getByRole("button", { name: "Add custom option" })).toBeTruthy();
  });

  it("closes the add form on cancel", () => {
    renderPlanner();

    fireEvent.click(toggle("Primi"));
    fireEvent.click(group("Primi").getByRole("button", { name: "Add custom option" }));
    fireEvent.click(group("Primi").getByRole("button", { name: "Cancel" }));

    expect(group("Primi").queryByRole("form")).toBeNull();
    expect(group("Primi").getByRole("button", { name: "Add custom option" })).toBeTruthy();
  });

  it("uses the current locale for the button", () => {
    setLocale("it");
    renderPlanner();

    expect(screen.getByRole("button", { name: "Salva" })).toBeTruthy();
  });
});
