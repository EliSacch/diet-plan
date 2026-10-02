# Frontend

The frontend is built with React + Typescript

## Table of content

- [Accessibility](#accessibility)

- [Deployment](#deployment)
  - [Local Deployment](#local-deployment)

- [Testing](#testing)
  - [Unit Tests](#unit-tests)
  - [Coverage](#coverage)

- [Linting and Formatting](#linting-and-formatting)
  - [Linting](#linting)
  - [Oxlint Configuration](#oxlint-configuration)
  - [Formatting](#formatting)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Accessibility

## Deployment

### Local deployment

Install the Node dependencies with yarn:

```bash
cd frontend
yarn install
```

Then start the app:

```bash
yarn start
```

The Vite dev server proxies `/api` and `/auth` to `http://localhost:8000`.

## Testing

### Unit tests

Run unit tests with

```bash
yarn test
```

### Coverage

[@vitest/coverage-v8](https://vitest.dev/guide/coverage) reports how much of the source the tests exercise. It is a dev dependency, installed with `yarn install`.

```bash
yarn vitest run --coverage
```

`vitest run` runs the suite once and exits. The report prints a summary and writes an HTML report under `coverage/`.

## Linting and Formatting

### Linting

[Oxlint](https://oxc.rs/docs/guide/usage/linter) checks the code. It is a dev dependency, installed with `yarn install`.

```bash
yarn lint
```

`yarn lint --fix` applies the fixes Oxlint can make automatically.

### Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

### Formatting

[Oxfmt](https://oxc.rs/docs/guide/usage/formatter) formats the code. It is a dev dependency, installed with `yarn install`.

```bash
yarn format
```

`yarn format --check` reports files that are not formatted and does not change them.

[Back to the top](#frontend)
