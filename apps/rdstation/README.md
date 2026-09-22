# RD Station CRM

Manage contacts, organizations, and deals in RD Station CRM.

- **Categories** — crm
- **Auth** — `api-key` (a per-user token, sent as the `token` query parameter)
- **Actions** — 10
- **Health checks** — `service` (feed-backed, `informational`) + the derived `auth:api-key`
- **Egress allowlist** — `crm.rdstation.com`
- **Website** — https://www.rdstation.com
- **API docs** — https://developers.rdstation.com/reference/crm-v1-introducao-e-requisitos

## What this app is — and what it deliberately is not

RD Station (TOTVS, Brazil) is a marketing-and-sales platform. The product this app talks to is
**RD Station CRM**, its sales CRM: contacts, organizations (empresas), deals (negociações) with
pipelines and stages, and the account's own users.

RD Station actually ships **two products with two entirely separate APIs**, and this app
implements **only one of them**:

1. **RD Station CRM API v1** — `https://crm.rdstation.com/api/v1`. Authenticated with a static
   per-user token passed as a query parameter. Published as a full OpenAPI 3.1 reference
   (`developers.rdstation.com/reference/crm-v1-*`), and self-serve: any CRM user on any paid plan
   can generate a token in the product itself.
2. **RD Station Marketing API v2 ("RDSM")** — `https://api.rd.services`. Authenticated with
   OAuth2 (authorization code), where the `client_id`/`client_secret` come from an app registered
   through RD Station's **App Store partner programme**.

**This app is the CRM v1 half only, and the Marketing API is left out on purpose.** RDSM is well
documented too, but there is no way to obtain or exercise its OAuth2 client credentials without an
approved App Store publisher account — so an RDSM integration built here could never be run
against the real service, and its auth flow could not be verified end to end. CRM v1 needs nothing
but a token a user can mint in a minute, and its entire surface is documented in the vendor's own
machine-readable reference, so it is the half that can actually be built and checked. If RDSM
support is ever wanted, it belongs in a separate app with its own OAuth2 auth method, not bolted
onto this one.

## Auth

One Auth method, `api-key`, mirroring the vendor's own scheme
(`securitySchemes.Token`: `{"type":"apiKey","name":"token","in":"query"}`):

- **Where the token comes from** — the CRM's own UI, under **Configurações → Integrações →
  Tokens** (help article: "Gerar e visualizar Token"). It is per-user and immutable once
  generated; rotating it means creating a new token and reconnecting.
- **How it travels** — appended to every request's query string as `?token=…` by the `sign` hook,
  which is the only code in this app that ever holds the credential. It runs in a network-less
  worker, and no Action declares or reads a credential: there is no `Authorization` header
  anywhere in `actions/`.
- **How it is checked** — `GET /token/check` returns `{"email","name","organization"}` for a live
  token and the documented `401 {"error":"Permission denied."}` for a dead one. The probe
  classifies from the **body** (a `200` without the documented `email` field is not a live token),
  never from the status code alone, and the token itself is never echoed into the result.

### The visibility-level caveat

A CRM token carries a per-category visibility setting — **Restrito / Equipe / Geral**, separately
for negociações, empresas and contatos — and it **silently narrows** what list/get/update calls
return to what that user's token owns or may see. So `list-contacts` returning fewer rows than the
account's own contact count is normal, not a bug: `total` in the envelope is the count the token
can see, and a record outside the level reads as not-found. Connect with a token whose visibility
matches the workflow's intent.

## Actions

| Action | Type | What it does |
|---|---|---|
| `list-contacts` | search | `GET /contacts` — paging (`page`, `limit`, `order`, `direction`) plus the documented `email`, `q` (name search), `phone` and `title` filters. |
| `get-contact` | read | `GET /contacts/{contact_id}` — one contact, verbatim. |
| `create-contact` | perform | `POST /contacts` — a contact; `emails`/`phones` can be given as a single `email`/`phone` (+`phoneType`) or as a JSON array, and the JSON form wins when both are set. |
| `update-contact` | perform | `PUT /contacts/{contact_id}` — same body as create, addressed by id; marked idempotent because a repeated PUT converges on the same record. |
| `list-organizations` | search | `GET /organizations` — paging plus `organization_segment`, `user_id` and `q`. |
| `create-organization` | perform | `POST /organizations` — `name`, `url`, `resume`, `user_id`. |
| `list-deals` | search | `GET /deals` — paging plus `name`, `win`, `user_id`, `deal_stage_id`, `deal_pipeline_id`, `deal_lost_reason_id`, `organization`, `campaign_id`. `win` is three-valued: leave it empty for **open** deals. |
| `create-deal` | perform | `POST /deals` — the deal's own fields plus optional `organization: {_id}` and `campaign: {_id}` links. |
| `list-deal-pipelines` | read | `GET /deal_pipelines` — the pipelines and stages that `deal_stage_id`/`deal_pipeline_id` expect. |
| `list-users` | read | `GET /users`, optionally filtered by `active`. |

Every Action builds its URL with `new URL(…\`${API_BASE}/…\`)`, attaches its documented filters
through `url.searchParams` (`lib/client.ts#applyQuery`, which drops unset values) and performs the
call through `lib/client.ts#sendJson` — the single place in the action surface that calls
`ctx.fetch`. Requests that fail throw with the vendor's own message
(`lib/client.ts#formatRdStationError`):

- `401 {"error": "Permission denied."}` — missing, disabled or invalid token.
- `404 {"errors": {"error_type": "RESOURCE_NOT_FOUND", "error_message": "…"}}`.
- `422 {"errors": {"<field>": ["…"]}}` — one key per offending field.

### Two limits to know before you rely on a list

- **Only the first 10,000 records of any list are reachable.** The reference states this for the
  list endpoints outright, and it holds across pages: past that depth, paging stops returning new
  records. An export of a bigger book has to be chunked by a filter it can narrow with (a date
  range, a stage, an owner) rather than by walking `page` forever.
- **120 requests/minute, account-wide.** `limit` is capped at 200 per page, and a `429` carries no
  readable counter or reset header on a normal response — which is why this app ships **no quota
  health check** (a `quota` check would have to invent a reading). The error formatter repeats the
  120/minute figure on a `429` instead.

### The gaps in `create-deal`, stated rather than papered over

`POST /deals` accepts `organization: { _id }` and `campaign: { _id }` links, and this app exposes
both. It also documents `contacts`, `deal_products`, `distribution_settings` and `deal_source`, and
this app leaves all four out:

- **`contacts` is a real gap in the API, not a shortcut here.** Unlike
  `organization`/`campaign`, its items are *full embedded contact objects*, not `{_id}`
  references — so an **existing** contact cannot be linked to a new deal by id through this
  endpoint at all. The deal has to be created first and the contact attached afterwards (in the
  CRM's own UI or through whatever endpoint the vendor provides for it).
- The other three nested objects are scoped out because the reference does not document their shape
  on this endpoint in a way that a param could express cleanly; guessing at it would be invention.

The same discipline applies to `create-organization`, which exposes the four simple fields
(`name`, `url`, `resume`, `user_id`) and skips the complex nested `organization_custom_fields` /
`organization_segments` arrays.

This app covers the ten Actions above and nothing else — the wider CRM v1 reference is not mirrored
here.

## Health checks

Two, answering two different questions.

### Is this credential live? — `auth:api-key`

Derived automatically from `Auth.test` (above), so it needs nothing of its own: the host projects
`GET /token/check` into the health surface and grades it from the response body.

### Is RD Station up? — `service`

Declared as a **feed**, not hand-parsed (`health/service.ts`), against
`https://status.rdstation.com/history.rss` — a live RSS document (verified 2026-09-22: `200`,
`application/rss+xml`, channel `Status RD Station`, `<generator>incident.io</generator>`, nine real
incident entries back to June 2026). The check reads `input.feed.latest` — one entry per incident,
newest first — and never re-implements Atom/RSS parsing.

- **It is `severity: "informational"`, and that is load-bearing.** The status page rolls up RD
  Station's *whole* product suite, not this app's surface: the live `summary.json` component list
  is dominated by RD Station Marketing (`Automação`, `Email Marketing`, `Landing Page`,
  `Segmentação de Leads`, `Link da Bio`, …) plus `Academy`, `Conversas de Whatsapp`, billing and
  `RD Station CRM para vender por Whatsapp`. There is **no component for the CRM v1 API** this app
  calls, so a red flag there is weak evidence about this app — it must never fatally downgrade the
  app's own verdict.
- **How an entry is read.** incident.io writes the incident's current state into the entry *body*
  (`<b>Status: …</b>`; the live vocabulary is localised Portuguese — `Resolvido`, `Concluído`) and
  leaves the *title* in its original outage wording ("Indisponibilidade RD Station CRM"), so the
  body is what decides. A closing word means the incident is over; a known opening word
  (`Investigando`, `Identificado`, `Em andamento`, …) turns the check `degraded`; an unfamiliar
  word — or a missing marker — reports `unknown` rather than guessing either way.
- **No egress widening.** `status.rdstation.com` is deliberately **not** in `w6w.network.allow`:
  a feed source's host is allowlisted implicitly for that hook only, and `credential: "none"` on
  the check means no status host ever sees a token. No Action calls a status page.

## Errors, retries and idempotency

`perform` actions declare idempotency honestly: the three creates are `idempotent: false` because
their endpoints have no idempotency key, so a retry after a timeout creates a second record —
`update-contact` is `true` because re-sending the same id and body converges.

## Icon

`assets/icon.svg` is downloaded verbatim (`curl`) from RD Station's own developer-portal CDN
(`files.readme.io/…-logo-370x64.svg`), where it is that portal's own page logo:

```
<svg width="370" height="64" viewBox="0 0 370 64" …>
```

That is what it is, and the README says so plainly: a **370×64 wordmark lockup** — the icon mark
plus the "Station" wordmark — **not a square icon-only mark**. No square mark could be verified:
`rdstation.com/favicon.svg` and `apple-touch-icon.png` both 404, simple-icons has no `rdstation`
slug, and there is no RD Station node in n8n's `nodes-base` to borrow one from. The artwork is
never re-wrapped or hand-edited.

Because that lockup is painted in a single dark navy (`#002233`) — legible on the light icon tile,
invisible on the dark one — the app also declares `appearance.darkMode.icon`. RD Station's own CDN
turned out to publish a matching white-ink variant of the identical artwork right alongside the
light one (`files.readme.io/…-logo-370x64-dark.svg`, confirmed 200, same 10 paths, same
`viewBox="0 0 370 64"`, only `fill="#FFFFFF"` differs), so `assets/icon.dark.svg` is that verified
vendor file downloaded verbatim — not a locally re-inked copy. Only the paint differs from the light
variant; every path, size and `viewBox` is the vendor's.

## Tests

`deno task test` runs the unit suite (74 tests) against a mocked `HookContext` — a fake `ctx.fetch`
with queued responses and a no-op `ctx.log` — so nothing here touches the network: each Action's
URL, method, headers and body are asserted, the Auth `sign`/`test` hooks are checked for what they
do and do not put on the wire, and the health check is exercised with hand-built feeds.
