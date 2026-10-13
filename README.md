# صيانة بلس — منصة المزود (Siana Plus Provider Platform)

This is the web platform where maintenance companies and independent technicians run their work on
Siana Plus:

- joining and onboarding;
- incoming requests and picking a technician;
- scheduling and following the work;
- the team and coverage;
- tenders;
- settlements, reviews and complaints;
- an optional store.

- Brief: `../Siana/docs/PROVIDER-PLATFORM-PROMPT.md`.
- Conventions: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Run locally

1. Start the API against the throwaway test database. It listens on :5123, and the OTP is always
   `1111`:

   ```bash
   ../Siana/.claude/run-local-test.cmd
   ```

2. Start the platform:

   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:5174. `/api` and `/uploads` are proxied to `VITE_API_PROXY_TARGET` (see
   `.env.development`).

Sign in with the phone of an owner or supervisor. To create a new organization, go to
`/join`.

## Environment

| Variable | Meaning |
|---|---|
| `VITE_API_BASE_URL` | API origin without `/api`. Leave it empty in development to use the proxy. |
| `VITE_API_PROXY_TARGET` | Dev only: where the Vite proxy sends `/api` and `/uploads`. |
| `VITE_STORAGE_PREFIX` | Prefix for every localStorage key (`siana.provider`). |
| `VITE_DEFAULT_LANG` | `ar` (default) or `en`. |
| `VITE_SUPPORT_PHONE` | Optional. Shown on the "organization suspended" screen. |
| `VITE_EXECUTOR_APP_IOS_URL`, `VITE_EXECUTOR_APP_ANDROID_URL` | Optional. Store links shown to technicians who try to sign in here. |

## Production

The API must allow the platform's origin, otherwise the browser blocks every call. On the server,
add the platform's URL to the CORS list, next to the existing entries (`../Siana/docs/DEPLOYMENT.md`):

```
Cors__AllowedOrigins__0=https://admin.example.com      # existing
Cors__AllowedOrigins__1=https://provider.example.com   # this platform
```

Then build:

```bash
npm run build
```

The build writes static files to `dist/`. Any static host with an SPA fallback to `index.html`
works; `vercel.json` is included.

## Scripts

```bash
npm run dev         # dev server on :5174
npm run typecheck
npm test            # vitest
npm run build
npm run gen:types   # regenerate src/api/types.gen.ts from ../Siana
```

## Acceptance tests (§11)

`e2e/acceptance.spec.ts` runs the brief's acceptance flow in a real browser:
1. registration → onboarding checklist → submit;
2. supervisor restrictions and the technician refusal;
3. incoming → candidate picker → assign → schedule.

It creates organizations, users and orders, so run it **only against the local test API**. Start
`../Siana/.claude/run-local-test.cmd` and `npm run dev` first, then:

```bash
E2E_OTP=1111 E2E_ADMIN_USERNAME=root E2E_ADMIN_PASSWORD=<local test password> npm run e2e
```

- Without those variables the spec skips itself.
- The admin account approves the new organization. It also routes the test order to it if auto-assignment
  gave the order to another provider, which happens when the API runs with demo providers enabled.
- If Playwright asks for a browser, run `npx playwright install chromium` once.
