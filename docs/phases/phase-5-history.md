# Phase 5 · History

**Goal:** the Admiral can see who changed which price or charge, from what to what, and when.

**Time:** ~1h, Sunday afternoon. **Depends on:** Phase 4 (uses pagination). The history rows themselves are already written since slices 2.1 and 2.2.

---

## Slice 5.1 · Settings history page

**Outcome:** a read-only log of every settings change.

### Build

| Layer | Work |
|---|---|
| Service | `settings/service.ts`: `listSettingsChanges({ page, entity })`. Joins the actor's name and the product or planet name |
| UI | `/admiral/history`: table with time (UTC), who, what (for example "Water · price" or "Mars · fuel cost"), old value → new value, and the difference. Filter: all, products, planets. Newest first, paginated. Links from the product and planet settings pages |

### Acceptance criteria

- [ ] Every change made in slices 2.1 and 2.2 is listed, one row per changed field.
- [ ] Old and new values are shown as money. The difference shows direction, for example "+$2.00".
- [ ] The seeded price change is visible on first login.
- [ ] The page is read-only. Rows cannot be edited or deleted anywhere in the app.
- [ ] Only the Admiral can open it.

### Edge cases

| Case | Expected |
|---|---|
| No changes yet | Empty state "No changes yet" |
| Change back to the original value | Two rows. The log keeps both |
| Several fields changed in one save | One row per field, same timestamp |
| Non-admiral opens the page or calls the service | Redirect home, `FORBIDDEN` |
| Entity filter with an unknown value in the URL | Treated as "all" |

### Tests

- Service: rows come back newest first with names resolved. Entity filter. Wrong role forbidden.

---

## Phase gate

- [ ] On the live URL, change a price, then see the row on the history page.
- [ ] CI green. `context.md` updated. Pushed.
