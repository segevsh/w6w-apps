# Lofty

Manage leads, tasks and notes in **Lofty**, a real-estate CRM (formerly branded "Chime" —
`api.chime.me` still answers, but the canonical host is `api.lofty.com`), plus webhooks, team
members, SMS/email sends and history, and team-wide lead vocabulary (tags, custom fields,
pipelines).

- **Categories** — crm, communication
- **Auth methods** — api-key
- **Actions** — 32
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.lofty.com` (the `service` health check adds `status.lofty.com` to
  its own hook allowlist, never to the app's — no action ever reaches it)
- **Website** — https://lofty.com/
- **API docs** — https://api.lofty.com/docs/
- **Status page** — https://status.lofty.com/

> **Verified against Lofty's own sources on 2026-09-22** — the OpenAPI 3.0.1 "Lofty Open API 1.0"
> specification embedded in the docs site's JS bundle (`https://api.lofty.com/docs/`, a
> Docusaurus SPA whose reference pages are client-rendered, but whose spec is a JSON string
> literal inside `assets/js/main.<hash>.js`), the rendered Getting Started page
> (`https://api.lofty.com/docs/intro`) for the auth header shape, and a live probe of
> `https://status.lofty.com/api/v2/summary.json`. Nothing here came from a third-party
> integration directory or a sibling app's guess.

## Auth

Lofty documents two schemes. This app implements only the second:

1. **OAuth 2.0** (Lofty's own recommendation) — needs a registered OAuth application, which
   requires separate vendor onboarding. Out of scope for this build.
2. **API Key** (what this app uses) — `Authorization: token <API_KEY>`. The prefix is the
   **literal lowercase word `token`**, not `Bearer` — confirmed verbatim from the rendered
   Getting Started page, section "2. API Key (Use with Caution)". The key is generated in a
   Lofty account at **Settings > Integrations > API**.

The credential probe is `GET /v1.0/me` ("who am I"). Its `UserResponse` shape
(`id, teamId, roleName, email, firstName, lastName, ...`) carries no key/token/secret field, so
it is safe to use as a liveness probe without echoing the credential back. Validity is judged
from the response **body**, never the status code alone: a rejected key answers a **JSON
string** (`"<message>"`), not an object, and only a body with an `id` counts as a live profile —
see [`auth/api-key.ts`](auth/api-key.ts).

## Actions (32)

| Resource | Actions |
| --- | --- |
| Lead | List, Create, Get, Update, Delete |
| Task | List, Create, Get, Update, Delete |
| Note | List, Create, Get, Update, Delete |
| Webhook | Create, List, Delete |
| Member | List, Get by account, Get current user profile (`me`) |
| Communication | Send SMS, Send Email, SMS History, Email History, Call History |
| Team Features | List Tags, List Custom Fields, List Lead Pipelines |
| Lead Activity | List (unified timeline for one lead) |
| Appointment | List |
| Organization | Get |

Every action calls a `/v1.0/...` path only — no `/v2.0` endpoint is used.

## Health checks

- **`service`** (`kind: service`, `severity: informational`) — reads
  `status.lofty.com/api/v2/summary.json`, a real Atlassian Statuspage. Its verdict follows only
  the component named exactly **"API"** (matched by name, not id, since ids are not stable across
  a component's lifetime) — the page's other components (`Lofty`, `Site`, `Listing`, `Dialer`,
  `Loftyworks`) are reported as detail but never drive the state, because an incident on the
  dialer or listing site says nothing about `api.lofty.com`. A broken or unrecognizable status
  page reports `unknown`, never `down` — the page failing to answer is not evidence the API is
  down.
- **`quota`** (`kind: quota`, `severity: informational`, `unavailable`) — declared absent rather
  than omitted. None of the 32 covered operations documents a rate-limit header
  (`X-RateLimit-*`, `Retry-After`) or an endpoint reporting remaining allowance, and the generic
  failure body is a bare message string with no quota detail — so headroom cannot be read, only
  budgeted from observed failures. An `informational unavailable` entry keeps the app off
  `unknown`-forever, which is what omitting the check entirely would cause.

## What was deliberately left out, and why

Lofty's Open API is ~105 endpoints across two specs (v1 "1.0", 65 endpoints; v2 "2.0", 40
endpoints). This build covers the 32 highest-value v1 operations for the record-keeping a
real-estate workflow runs on — leads, tasks, notes, webhooks, communication and team vocabulary
— and stops there deliberately (scope discipline, not unconfirmed detail):

- **Lead Routing** (update/get default routing rule, list rules, list assignable roles, list
  assignable members, preview routing) — a whole configuration surface of its own, orthogonal to
  record CRUD.
- **Brokermint sync** (`PUT /brokermint/transaction`, `PUT /brokermint/lead`) — a
  transaction-management integration, not a general CRM action.
- **Lead Transaction** (get/update/create a transaction, its property address, list transactions
  custom fields) and **Mass Actions** — a separate sub-resource with its own lifecycle; left for a
  follow-up build if there's demand.
- **Lead Manual Log** (list/add/get/delete a call/email/text log entry) — overlaps with the
  Communication history actions this build already covers.
- **Agent Organization writes** (add/update office, update company), **Agent User** (create
  agent, add tags), **Opportunity** (send alert), **Communication search by agent** — org/agent
  administration, not the lead-record surface this build targets.
- **Vendor list**, **Listing search / published listings**, **Calls** (list/get/get recording
  URL), **System Logs**, **deprecated `GET /users/{userId}`** — lower-value or explicitly
  deprecated reads.
- **The entire v2 spec** ("Lofty Open API v2.0": Sales Agent working-lead queues, Calendar,
  batch plan-tasks, AI features, Agents V2 activate/deactivate, Transactions V2) — a distinct,
  newer product surface (Lofty's AI sales-agent workflows) that deserves its own scoped build
  rather than a partial one bolted onto this app.

None of the above was left out because it couldn't be confirmed — every one of the 32 shipped
actions, and only those, was checked field-by-field against the extracted OpenAPI spec before
being implemented.

## Notable API quirks (see file-level doc comments for the full detail)

- **One host, one prefix**: `https://api.lofty.com/v1.0/...` for every covered operation.
- **Failures are a JSON *string***, not an object — `"<message>"` — while success is always an
  object or array. [`lib/client.ts`](lib/client.ts)'s `formatLoftyError` unwraps this.
- **Time is inconsistent**: task/note timestamps are `yyyy-MM-dd HH:mm:ss` strings in some
  fields, epoch milliseconds in others (task deadlines, activities) — each action's params
  document which.
- **Lead Delete is a soft delete** that requires a `reason` query parameter, recorded for audit
  (not a body field — it therefore appears in the request URL, so the action's hint says to keep
  it non-sensitive).
- **Lead Create's notice booleans send mail**: `welcomeEmail`/`leadAlert` are not stored flags —
  setting them causes Lofty to actually email the lead / alert the agent, and the spec marks both
  create-only ("Not supporting update").
- **SMS Send** falls back to the lead's own phone number when none is supplied, and echoes back
  which number was actually used.

## Testing

Unit tests mock `HookContext` (`ctx.fetch`, no-op `ctx.log`) via
[`tests/_helpers.ts`](tests/_helpers.ts) — no network access, no real credential. Run with
`deno task test` from this directory.
