# Frontend

The frontend is built with React + Typescript

## Table of content

- [Accessibility](#accessibility)

- [Deployment](#deployment)
  - [Local Deployment](#local-deployment)

- [Testing](#testing)
  - [Unit Tests](#unit-tests)

- [Linting and Formatting](linting-and-formatting)
  - [Oxlint Configuration](oxlint-configuration)


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

The Vite dev server proxies `/api` to `http://localhost:8000`.

## Testing

### Unit tests

Run unit tests with

```bash
yarn test
```



## Linting and Formatting

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

[Back to the top](#frontend)
