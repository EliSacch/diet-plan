# Accessibility

The frontend meets [WCAG 2.2](https://www.w3.org/TR/WCAG22/) levels A and AA. This file is the requirement for UI changes.

## Enforcement

`yarn lint` from `frontend` includes the `jsx-a11y` rules in `.oxlintrc.json`. Those rules fail the command. They do not print as warnings.

CI runs that command as the `frontend lint` job on every pull request and on every push to `main`, next to `frontend format` and `frontend coverage`. A failing lint job blocks the merge the same way a failing test job does. Require `frontend lint` in branch protection if the other frontend checks are required.

The commit hook in `.githooks/pre-commit` runs the same command when a commit touches `frontend/`. Install it once per clone:

```bash
git config core.hooksPath .githooks
```

New pull requests include the checklist in `.github/pull_request_template.md`. Lint covers names, labels, roles, alt text, and keyboard handlers on non-interactive elements. Review covers the requirements below that a linter cannot see: focus order, contrast, language, page titles, and live regions.

`jsx-a11y/prefer-tag-over-role` is off. It asks for `output` instead of `role="status"`, and for `fieldset` instead of `role="group"`. Those tags do not match the widgets in this app. Use a native element when it matches: `button`, `a`, `label`, `input`, `dialog`, `progress`. Keep an ARIA role when the native tag would be wrong.

A backdrop may use a click handler without a key handler when Escape and a labelled Close or Cancel control are present. The day strip may handle arrow keys on its `role="group"`. Both exceptions are marked in the component.

## Page

- `document.documentElement.lang` matches the active catalog (`en` or `it`).
- `document.title` names the screen. Sign-in, home, my plan, profile, 404, and 500 do not share one title.
- Each screen has one `h1` that names the page. Sections use `h2`, then `h3`, without skipping a level.
- The main navigation is a `nav` with an accessible name. The current page sets `aria-current="page"`.
- The current page is not indicated by color alone. Below 768px it still needs a second cue, such as the desktop pill, an underline, or a heavier weight.
- Decorative images use `alt=""`. Decorative icons use `aria-hidden="true"`. An icon button has an accessible name.

## Keyboard and focus

- Every action works with the keyboard. Drag and drop has a button that does the same job.
- Focus is visible. Do not remove `:focus-visible` without a replacement that meets 3:1 against the adjacent color.
- A dialog traps Tab and Shift+Tab, closes on Escape unless closing is disabled, and returns focus to the control that opened it. The confirm modal uses a native `dialog`. The day planner drawer does the same in `Drawer.tsx`. Page content outside the drawer is `inert`, except a confirm `dialog` opened on top of it.
- A focused control is not covered by a sticky header, a sticky action bar, or a dialog backdrop. Scroll containers with sticky layers set `scroll-padding` so the focused control clears them.
- Target size is at least 24 by 24 CSS pixels. Prefer 44 by 44 for primary controls.

## Names and labels

- Every input has a visible label tied with `htmlFor`, or an accessible name that contains the visible text.
- A control’s accessible name contains the text the user sees. The “Multiple” switch shows “Multiple” (`"Multipla"` in Italian). That word is part of the name, together with the category, for example `Multiple, Primi`.
- Icon-only buttons name the action and the thing it acts on when more than one is on the page. `Dismiss: Day saved` rather than `Dismiss` alone.
- The day strip exposes one tab stop, the selected day. Left and Right move focus to the previous and next available day, skipping days the plan does not cover. Home and End move to the first and last available day. Enter or Space selects the focused day. Moving focus does not change the selected day. Each day button exposes its pressed state, and today sets `aria-current="date"`.

## Forms and errors

- Invalid fields set `aria-invalid` and `aria-describedby` pointing at the error text.
- On a failed submit, focus moves to the first invalid field.
- A unit shown beside an amount is part of that field’s name or description.

## Status messages

- A loading state uses `role="status"` and a text label.
- A progress indicator exposes `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.
- Errors that appear without a focus move use an assertive live region. Do not put `role="alert"` inside an `aria-live="polite"` region.
- A toast that reports an error stays until the user dismisses it. Other toasts pause their timer while the pointer or focus is on them. The dismiss control is reachable before the toast disappears.
- A button that is busy sets `disabled`, not only `aria-busy` or `pointer-events: none`.

## Color, contrast, and motion

- Text meets 4.5:1 against its background. The current tokens do: body text is about 13.8:1, green is about 8.7:1, warning is about 11.8:1, and danger is about 5.1:1 on the page and 4.9:1 on the upload card.
- UI boundaries and focus indicators meet 3:1. The unselected day circle border is about 1.4:1 and does not meet this.
- Information is not conveyed by color alone.
- CSS animation and JS motion, including `scrollIntoView({ behavior: "smooth" })`, honor `prefers-reduced-motion`.

## Current gaps

The requirements above are the bar. These files do not meet them yet. A change that touches one of these files closes its gap in the same change.

| Gap                                                                             | Where                                                                                        |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `lang` stays `en` when the UI is Italian                                        | `index.html`, `src/i18n/index.ts`                                                            |
| Toasts disappear after 5 seconds, and errors are nested in a polite live region | `src/components/Toast.tsx`, `src/context/ToastContext.tsx`                                   |
| Invalid fields are not focused on submit                                        | `src/components/CustomOptionForm.tsx`, `src/components/PickEditor.tsx`                       |
| The amount unit is not associated with the field                                | `src/components/PickEditor.tsx`                                                              |
| The switch name omits the visible word “Multiple”                               | `src/components/DayPlanner.tsx`                                                              |
| The current nav item is color alone below 768px                                 | `src/components/NavBar.css`                                                                  |
| Every route shares the title DietPlan                                           | `index.html`, `src/routes/`                                                                  |
| Sticky headings and the save bar can cover focus                                | `src/styles/plan-sections.css`, `src/components/DayPlanner.css`, `src/components/Drawer.css` |
| The upload button stays enabled to the keyboard while busy                      | `src/components/UploadDietPlan.tsx`                                                          |
| Unselected day circles are below 3:1                                            | `src/components/DateStrip.css`                                                               |
| Home, My plan, and Profile have no `h1`                                         | `src/pages/Home.tsx`, `src/components/DietPlan.tsx`, `src/pages/Profile.tsx`                 |
| The profile email is truncated, and the full value is only in a tooltip         | `src/pages/Profile.tsx`                                                                      |
| The date strip smooth-scrolls when reduced motion is requested                  | `src/components/DateStrip.tsx`                                                               |
