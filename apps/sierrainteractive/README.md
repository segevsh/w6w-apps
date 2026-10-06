# Sierra Interactive

Leads, notes, tasks, saved listings, listing requests and action plans in
[Sierra Interactive](https://www.sierrainteractive.com/), the real-estate CRM, over its API at
`https://api.sierrainteractivedev.com`. Every path, verb, parameter and body field comes from the
vendor's Swagger 2.0 document (`/swagger/docs/v1`, fetched 2026-10-06) and every route was
spot-checked against the live host. App id `io.w6w.sierrainteractive`.

The icon (`assets/icon.svg`) is Sierra's own mark, byte-for-byte the `safari-pinned-tab.svg` linked
from the vendor site's `<head>`; `assets/icon.dark.svg` is the same artwork re-inked white for the
dark tile (a one-colour mark, so the reversed treatment applies).

## Auth

One method, `api-key` (type `apiKey`): the key goes in the `Sierra-User-ApiKey` request header
(`securityDefinitions` in the Swagger document). Ask Sierra support or your account manager to
enable API access and issue a key. The credential is only ever read by the `sign` hook.

The connection test calls `GET /zapier/validateAPIKey` and decides from the response body, not the
status line (see below).

## Actions (27)

Lookups (`read`, no parameters; the vendor body is returned under `data`):

| Key | Endpoint |
|---|---|
| `list-agents` | `GET /zapier/agents` |
| `list-sites` | `GET /zapier/sites` |
| `list-lead-sources` | `GET /zapier/leadSource` |
| `list-lead-statuses` | `GET /zapier/leadStatus` |
| `list-email-statuses` | `GET /zapier/emailStatus` |
| `list-phone-statuses` | `GET /zapier/phoneStatus` |
| `list-task-types` | `GET /zapier/taskType` |
| `list-mls-regions` | `GET /zapier/mlsRegion` |
| `list-lead-types` | `GET /zapier/leadTypes` |
| `list-tags` | `GET /zapier/tags` |
| `list-site-lead-sources` | `GET /zapier/siteLeadSources` |
| `list-traditional-action-plans` | `GET /zapier/traditionalActionPlans` |
| `list-fully-automated-action-plans` | `GET /zapier/fullyAutomatedActionPlans` |
| `list-start-next-day-values` | `GET /zapier/getStartNextDayValues` |
| `list-fully-auto-stop-statuses` | `GET /zapier/getFullyAutoActionPlanStopStatus` |

Writes and finds:

| Key | Endpoint | Notes |
|---|---|---|
| `lead-create` | `POST /zapier/leads` | non-idempotent; body `LeadApiSaveReqModel`; 30 of its 31 fields (the `session` object is omitted) |
| `lead-update` | `PUT /zapier/leads/{idOrEmailOrPhone}` | same body; only set fields are sent |
| `lead-find` | `PUT /zapier/findLead/{idOrEmail}` | a `read` action despite the verb |
| `lead-note-add` | `POST /zapier/leads/{idOrEmail}/note` | non-idempotent |
| `lead-task-create` | `POST /zapier/leads/{idOrEmail}/createTask` | non-idempotent |
| `saved-listing-create` | `POST /zapier/savedListings` | non-idempotent |
| `request-info` | `POST /zapier/requestInfo` | non-idempotent |
| `schedule-showing` | `POST /zapier/scheduleShowing` | non-idempotent |
| `action-plan-apply-traditional` | `PUT /zapier/applyTraditionalActionPlan` | |
| `action-plan-apply-automated` | `PUT /zapier/applyFullyAutomatedActionPlan` | |
| `action-plan-stop-traditional` | `PUT /zapier/stopTraditionalActionPlan` | |
| `action-plan-stop-automated` | `PUT /zapier/v2/stopFullyAutomatedActionPlan` | optional stop status |

Every action returns the vendor's response under `data`. Agents are named in a request by a JSON
object (`{"agentUserEmail": "..."}`, any of `agentUserId`, `agentUserEmail`, `agentUserPhone`,
`agentUserFirstName`, `agentUserLastName`, `agentSiteId`).

## Things worth knowing

- **The documented API is the Zapier controller.** The Swagger document lists exactly 49
  operations, all under `/zapier/`; its `definitions` section carries models for a wider API
  (lead search, ponds, users, offices, blog posts) with **no paths**, so those are not callable
  from the document and are not covered. Response schemas are all an untyped `object`, which is
  why results are passed through rather than reshaped.
- **A rejected key is HTTP 400, not 401** — `{"success":false,"errorMessage":"Unauthorized
  request"}` — and an unknown path is a JSON 404 with the same envelope. Errors are classified from
  the body; a `success: false` body is treated as a failure even on HTTP 200.
- **The Swagger host says port 1444**, and the UI redirects there, but the same API answers on
  the default HTTPS port, which is what this app uses (one declared host, no port).
- **Lookup-by-PUT.** `findLead` is a `PUT`; the Zapier "find" step.
- **Not covered:** `/zapier/subscribe` and `/unsubscribe` (REST-hook registration for Zapier's own
  event types, whose `type` enum is undocumented), and the `/zapier/test/*` and
  `/zapier/*newXTest` sample-payload endpoints. The older `stopFullyAutomatedActionPlan` variants
  are superseded by the `v2` route used here.

## Health checks

| Key | Kind | What it reads |
|---|---|---|
| `service` | `service` | Statuspage at `status.sierrainteractive.com` (`/api/v2/summary.json`, page id `8stc99wmsg1b`). It has six *region* components, no API component, so the verdict is the worst region. |
| `api` | `dependency` | Unsigned `GET /zapier/validateAPIKey`; a schema-correct `400` envelope is a pass. |
| `quota` | `quota` | Declared unavailable (`informational`): no rate limit or headers are documented or observed. |

Plus the derived `auth:api-key` check from the connection test.
