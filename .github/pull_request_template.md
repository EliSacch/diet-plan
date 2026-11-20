## Summary

## Test plan

- [ ]

## Security

- [ ] No new data API, or every new/changed data route uses `CurrentUser` (no client-supplied `user_id`).
- [ ] No new user-owned resource, or a cross-user test covers isolation (404 / empty for another user).
- [ ] No new upload or expensive parse path, or size limits and rate limits run before the heavy work.
- [ ] No new cookie / token storage, or sessions stay HttpOnly cookies (not `localStorage` / `sessionStorage`).
- [ ] No secrets or credentials in the diff (use env / Render `sync: false`).
- [ ] No new XSS sink (`dangerouslySetInnerHTML`, raw HTML, `eval`).

## Accessibility

UI changes follow [frontend/ACCESSIBILITY.md](frontend/ACCESSIBILITY.md).

- [ ] No frontend UI change, or `yarn lint` passes. CI runs this as `frontend lint`.
- [ ] Keyboard, focus, names, contrast, language, and titles for any changed screen match the standard.
- [ ] No file under Current gaps was changed, or this change closes that gap.
