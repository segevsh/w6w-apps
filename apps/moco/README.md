# MOCO

MOCO is a combined CRM, project time-tracking and invoicing tool built for agencies and
consultancies. This app covers contacts, the companies they belong to, projects, tracked
time activities, and invoices.

- **Categories** — crm, finance, project-management
- **Auth methods** — api-key
- **Actions** — 17
- **Health checks** — 2 (`account`, `service`) + the derived `auth:api-key`
- **Egress allowlist** — `*.mocoapp.com` (per-account subdomain — see below)
- **Website** — https://www.mocoapp.com
- **API docs** — https://everii-group.github.io/mocoapp-api-docs/ (rendered reference) and its
  linked machine-readable spec, https://docs.mocoapp.com/api/docs/v1.yaml (OpenAPI 3.0.3,
  "MOCO API v1 (beta)"); read 2026-09-15.

## A stale link, and where the real docs actually live

The catalog entry this app started from pointed at
`https://hundertzehn.github.io/mocoapp-api-docs`. That URL is now just a meta-refresh redirect
page (`<meta http-equiv="refresh" content="0; URL=https://everii-group.github.io/mocoapp-api-docs/">`)
— "hundertzehn" (the German word for "one-ten", MOCO's original publisher) was acquired/rebranded
to **Everii Group**, and the real, current docs live at
`https://everii-group.github.io/mocoapp-api-docs/`, confirmed live (200, ~25KB HTML), same
pattern as `apps/quo` (OpenPhone → Quo) and `apps/kommo` (amoCRM → Kommo) documented their own
vendor renames.

That rendered reference is itself only half the story: its `entities.html` page carries a
deprecation notice — "The Entities section of the API is deprecated and will no longer be
maintained. Please refer to our OpenAPI documentation for the latest API reference" — linking to
`https://docs.mocoapp.com/api/docs/v1` (a Scalar-rendered viewer) whose actual document is
`https://docs.mocoapp.com/api/docs/v1.yaml`, a **70,000+ line OpenAPI 3.0.3 spec** dated as the
current "v1 (beta)" API. Every endpoint, field and error shape in this app was verified against
that YAML document directly, not against the (still generally accurate, but secondary) rendered
`sections/*.html` pages.

## Setup

1. In MOCO, go to your profile's **Integrations** tab for a personal **User API key**, or
   **Settings → Extensions → API & Webhooks** for an account-wide key (read-only or full-access).
2. Paste the key into the connection, along with your **account subdomain** — just the `acme`
   part of `https://acme.mocoapp.com`, not the full URL.

## Why the base URL is a connection field, not a fixed host

MOCO gives every account its own host: `https://{account}.mocoapp.com/api/v1`, confirmed by the
`servers` block of the OpenAPI document itself (`variables.account.default: demo`). There is no
single shared API gateway host the way there is for e.g. a single-tenant SaaS with one `api.*`
domain, so the account subdomain is collected as an Auth field (same pattern as `apps/freshdesk`'s
`domain`) and the egress allowlist uses the narrower wildcard form `*.mocoapp.com` — matching any
subdomain of MOCO's own fixed apex, rather than the fully-open `*` this pack reserves for apps
with no fixed vendor domain at all (e.g. self-hosted `apps/mautic`).

## The finding that would have cost someone a day: one 401, two unrelated causes

MOCO's `GET /session` (its own documented key-verification endpoint) returns **401 for both** a
bad API key and a nonexistent account subdomain — with the only difference being the response
body's `message` field. Verified live:

```
$ curl https://demo.mocoapp.com/api/v1/session
401 {"message":"Invalid API key."}

$ curl https://this-account-should-not-exist-zzz999.mocoapp.com/api/v1/session
401 {"message":"Subdomain does not exist."}
```

A status-code-only check would report a typo'd account subdomain as "your API key expired" —
exactly backwards. This app's auth `test` hook and the `account` health check both read the
`message` body and branch on it, so a wrong subdomain is reported as a wrong subdomain.

## Health checks

- **`account`** (`kind: "dependency"`, unsigned) — an unauthenticated `GET /session` against this
  connection's account subdomain. A 401 whose body complains about the key (not the subdomain)
  still passes: it proves the subdomain resolves and the API answers, which is the whole question.
  Only a 5xx, or a 401 whose body says the subdomain itself doesn't exist, reports `down`.
- **`service`** (`kind: "service"`, feed-backed) — `status.mocoapp.com` redirects to
  `www.mocoappstatus.com`, a real Atlassian Statuspage-hosted page (verified live) that publishes
  an Atom history feed at `/history.atom`. Declared with `feed` rather than hand-parsed, same
  convention as `apps/bitly`.
- **`auth:api-key`** (derived) — the same `GET /session` probe, signed. Its response body is only
  `{ id, uuid }` — MOCO's internal user id and a stable UUID — never the API key itself.

No `quota` check: MOCO documents a rate limit (120 requests / 2 minutes, 429 on excess) but no
`X-RateLimit-*` (or equivalent) response headers to read headroom from ahead of time, so there is
nothing to probe.

## Actions

- **Contacts** — List, Get, Create, Update (`/contacts/people`)
- **Companies** — List, Get, Create (`/companies`; customers, suppliers and organizations)
- **Projects** — List, Get, Create (`/projects`). Create covers standard (non-retainer) projects
  only — MOCO's retainer billing (`retainer: true`, requiring `start_date`/`finish_date`/
  `budget_monthly` together) is a distinct business flow better driven from MOCO's own UI.
- **Activities** — List, Get, Create, Update (`/activities`; tracked time entries). Duration is
  taken as decimal hours and converted to MOCO's `seconds` field internally — the OpenAPI schema
  marks `hours` `deprecated: true`, kept only for backward compatibility, so this app never sends
  it on the wire.
- **Invoices** — List, Get, Update Status (`/invoices`). Status transitions are restricted to the
  four MOCO's own `update_status` enum documents (`created`, `sent`, `overdue`, `ignored`) —
  `paid` is derived from recorded payments, not a direct transition, so it is intentionally not
  offered here. Invoice *creation* is out of scope: MOCO's invoice payload models full line items,
  tax codes and payment terms as a nested structure the OpenAPI document does not fully resolve
  inline, and getting that wrong risks generating a malformed real invoice — better left out than
  guessed at.

## Notes

- List endpoints return MOCO's pagination headers (`X-Page`, `X-Per-Page`, `X-Total`); this app
  surfaces them as `page`/`perPage`/`total` output fields so a workflow can page through results.
  MOCO's `custom_properties` filter/field (per-account custom fields) is supported on the
  create/update/list actions that document it, as free-form JSON.
- Icon: MOCO's own apple-touch-icon (`https://www.mocoapp.com/assets/apple-touch-icon-*.png`,
  180×180, the largest served), fetched live from the vendor's homepage and embedded as a raster
  image inside `assets/icon.svg` (same technique as `apps/bloomerang`, `apps/bannerbear`) —
  simple-icons has no MOCO entry (`cdn.simpleicons.org/moco` → 404, checked first).
