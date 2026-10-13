# صيانة بلس — منصة المزود: working notes

Read these before changing code:

1. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): folder rules, the provider context, and the
   conventions (URL-synced list state, `DataTable` with phone cards, `useAction` + `ActionDialog`,
   `StatusBadge`, `PhoneField`, Riyadh time, an i18n namespace per feature).
2. The product brief in the backend repo: `../Siana/docs/PROVIDER-PLATFORM-PROMPT.md`. **Never invent an
   endpoint, field, status or error code.**
3. `src/features/service-items/` in `../Siana-Dashboard` shows the house style for list, detail and
   action pages.

Before finishing any change, run:

```bash
npm run typecheck
```

```bash
npm test
```

After a backend DTO or enum change:

1. Run `npm run gen:types`.
2. Fix what `npm run typecheck` reports.
3. Add labels for the new enum values in `src/i18n/enums.ts`, in provider wording. The enum test
   enforces this.

Local testing: run `../Siana/.claude/run-local-test.cmd`. It serves the API on :5123 with OTP `1111`.
Then run `npm run dev`, which serves the app on :5174 with /api proxied to :5123.
