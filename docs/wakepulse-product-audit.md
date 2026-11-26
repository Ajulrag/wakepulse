# WakePulse product and engineering audit

## Scope and baseline

This static audit covered the React routes and pages, shared UI and theme
styles, browser API clients, Express routes/controllers/middleware, MongoDB
service and dashboard queries, authentication and password recovery, the
monitoring scheduler and HTTP checker, tests, and Docker/Caddy/Nginx
configuration.

Existing product flows are present for registration and login, protected
workspace pages, one-hour single-use password reset, service creation/editing,
pause/resume/removal, manual checks, scheduled checks, service summaries,
dashboard metrics/activity, theme selection, browser preferences, and the
Docker Compose production route through Caddy to the private API.

Baseline validation before edits:

- `npm run typecheck`: passed.
- `npm --prefix server test`: passed (40 tests across 6 files).
- `npm run build`: passed for client and server.
- `npm --prefix client run lint`: failed on synchronous state updates from
  effects in `ServiceDetailsPage.tsx` and `SettingsPage.tsx`.

## Findings

### P0 — outbound check destination validation is not sufficiently strong

`server/src/utils/url-security.ts` resolves a host to inspect its addresses,
then `server/src/utils/http-checker.ts` performs a separate `fetch`, which
resolves the host again. A DNS answer can therefore change between validation
and connection. The blocked-address checks also omit some special-purpose
IPv4/IPv6 ranges, and endpoint validation compares hostnames without requiring
the original scheme and port. Tighten destination validation and bind each
connection to the validated address without changing the monitoring API.

### P1 — history is presented as a total but only contains a recent slice

`server/src/services/dashboard-activity.service.ts` defaults to ten records.
`client/src/pages/HistoryPage.tsx` derives “Total checks” and issue counts from
that activity response, so the displayed totals are only totals for the
returned slice. There is no way to load older checks. Add a bounded,
cursor-paginated history API and make the UI label counts according to the
data actually shown.

### P1 — settings are stored but not applied

`client/src/pages/SettingsPage.tsx` saves `defaultWindow`, `autoRefresh`, and
`compactCards` to local storage, but the dashboard does not refresh on a timer,
the compact preference is not applied, and the selected window does not
initialize service statistics. The preferences currently promise behavior
that is not implemented.

### P1 — recoverable API failures can replace the entire application

`client/src/api/request.ts` emits a global backend-error event on connection
and server failures. `client/src/App.tsx` handles that event by replacing the
entire route tree with a fatal error page. This bypasses the per-page loading,
error, and retry states, preventing recovery from otherwise recoverable API
failures.

### P1 — unsupported trust and availability claims appear in authentication
screens

`client/src/pages/LoginPage.tsx`, `RegisterPage.tsx`,
`ForgotPasswordPage.tsx`, and `ResetPasswordPage.tsx` repeat “SOC 2 Type II
Certified” and “99.99% Uptime SLA” claims. `AuthShowcase.tsx` also presents
global/multi-region monitoring and “Zero Cold Starts” claims. These capabilities
are not supported by the audited implementation and should not be represented
as product facts.

### P2 — service summary reads every matching check into application memory

`server/src/services/service.service.ts` loads all checks in the requested
window and calculates metrics in Node. At short configured intervals this can
create a large in-memory result and `Math.min`/`Math.max` argument list. Move
metric aggregation to MongoDB while preserving the existing response shape.

### P2 — due services are fetched without a batch limit

`server/src/services/service.service.ts:getDueServices` materializes every due
service before `runWithConcurrency` limits active HTTP checks. Worker
concurrency is bounded, but memory and database transfer are not. Process due
services in bounded batches and let subsequent cycles continue the backlog.

### P2 — production routing documentation is inconsistent with the deployment

The Compose stack uses Caddy for public HTTPS and Nginx as the internal static
web server/reverse proxy. The README lists Nginx without describing Caddy in
the stack, and lists `shared/` and `scripts/` although those directories are
not present in the repository. Clarify the actual deployment and repository
layout without changing the deployment workflow.

### P2 — responsive service table remains a wide desktop table

`client/src/App.css` adapts its filters and shell for narrow screens, but the
service table has a fixed minimum width and depends on horizontal scrolling.
Improve the mobile presentation while preserving access to all service
actions.

## Prioritized implementation plan

1. **Security and recoverability:** close the outbound destination-validation
   gaps; keep HTTP failures inside page-level recoverable states.
2. **Data correctness:** provide paginated monitoring history and avoid
   presenting the first page as an all-time total.
3. **Functional preferences:** apply the saved refresh, compact-layout, and
   monitoring-window preferences; remove lint-triggering effect state resets.
4. **Trustworthy product presentation:** add a public landing page and remove
   unsupported security/SLA/availability assertions.
5. **Resource efficiency:** aggregate service metrics in MongoDB and bound
   scheduler result batches without introducing infrastructure or retention
   changes.
6. **Responsive polish and operational clarity:** refine shared responsive
   styles, document the actual Caddy/Nginx path and repository layout, then
   rerun tests, lint, type checks, and production builds.

Existing collections, fields, records, environment variable names, public API
contracts, and Compose service boundaries are to remain compatible. No
destructive data migration or log-retention policy is included.

## Implementation and verification

The findings above have been addressed without adding dependencies or changing
the deployment topology:

- Outbound checks validate every resolved address, reject non-public
  destinations and endpoint origin changes, and pin the HTTP connection to the
  validated address. Requests have timeouts, shared keep-alive agents, and
  bounded response draining.
- Monitoring history now uses an authenticated, owner-scoped cursor API with
  bounded pages and a supporting compound index. The UI labels counts as
  loaded records rather than all-time totals.
- Browser preferences now drive dashboard refresh, compact presentation, and
  the initial service-statistics window. Recoverable API errors remain in
  page-level retry states.
- A public landing page describes supported product behavior; unsupported
  certification, SLA, multi-region, and cold-start claims were removed.
- Service statistics are aggregated in MongoDB, and scheduler work is fetched
  in bounded batches. Checks are deduplicated within the current API process;
  this is not a distributed lock and does not coordinate multiple API
  replicas.
- Service/history tables adapt to narrow screens, and the README now matches
  the repository layout and Caddy-to-Nginx-to-API deployment path.

Verification after these changes: backend tests, client lint, TypeScript
typechecks, and production client/server builds pass. A local browser smoke
check confirmed the public landing page renders at desktop and mobile widths;
the expected `/api/auth/me` request cannot succeed when running the frontend
without the API and was not treated as an application failure.
