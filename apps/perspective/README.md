# Perspective

Read Perspective funnel workspaces, CRM contacts and analytics, and create or update contacts, over
the **Perspective External API** (`https://api.perspective.co/v1`).

- **Categories** — marketing, crm, analytics
- **Auth methods** — api-key (`x-perspective-api-key` header)
- **Actions** — 8
- **Health checks** — 3 (`api`, ~~`service`~~, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.perspective.co`
- **Website** — https://perspective.co/
- **API docs** — https://developers.perspective.co/api-reference/overview
- **Status page** — none (see below)

> Verified on 2026-10-06 against the vendor's developer docs (Docusaurus; source in
> `github.com/Perspective-Software/developer-docs`) and live probes of the API host.

## Actions

| Action | Verb and path | Notes |
|---|---|---|
| `workspace-list` | `GET /workspaces` | Start here: campaign ids are the `funnelId` of every other action |
| `contact-list` | `GET /funnels/{funnelId}/contacts` | `page` (0-based), `limit` 1-100, `sortField`, `sortOrder`; returns `{data, meta}` |
| `contact-get` | `GET /funnels/{funnelId}/contacts/{contactId}` | |
| `contact-create` | `POST /funnels/{funnelId}/contacts` | Email or phone required; answers 201 |
| `contact-update-value` | `PUT /funnels/{funnelId}/contacts/{contactId}/values` | One field per call; non-standard names become custom properties |
| `kpi-get` | `GET /funnels/{funnelId}/metrics/kpis/{subtype}` | 9 KPI subtypes; `from`/`to` required |
| `chart-get` | `GET /funnels/{funnelId}/metrics/charts/{subtype}` | 7 chart subtypes; `abTest` only for page-to-page |
| `insight-get` | `GET /funnels/{funnelId}/metrics/insights/{insightId}` | Per-question answer counts |

This is the entire documented REST surface (the sitemap's API-reference section lists exactly these
eight operations).

## Decisions

- **Host.** The reference documents `api.perspective.co/v1`. `perspective-api.co` also answers with
  the same 401 body, but no documentation mentions it, so it is neither called nor allow-listed.
- **Auth probe.** `GET /v1/workspaces` (the vendor's own "verify your key" call). It needs a key and
  returns only ids, names and campaign status; there is no whoami endpoint, so nothing that echoes
  a credential is involved. The verdict is read from the body, not the status: a missing key
  (`API key is required`) and a wrong key (`Invalid or unauthorized API key`) are both 401 and differ
  only in text. A 403 means the key authenticated but lacks the workspaces permission, so the
  connection is accepted.
- **Health.** `api` is an unsigned `GET /v1/workspaces`; a schema-correct `{"error","status"}` 401
  is a **pass** (it proves reachability). HTML or non-JSON is `down`, 5xx is `down`, 429 is
  `degraded`.
- **Status page.** None. `status.perspective.co` does not resolve and neither the docs nor the site
  link to one, so `service` is a declared absence (`informational`).
- **Quota.** `quota` is a declared absence (`informational`): the limit is 100 requests/minute, but
  there is no usage endpoint and the `RateLimit-*` headers appear only when the limit is near or hit.
- **Deprecated.** The only deprecation in the reference is the contact `timezone` field (use
  `meta.ps_timezone`). It is not offered on create.
- **Left out.** Email sequences, funnel building and brands are MCP-only (no REST endpoints), so
  they are not in this app. Funnel *listing* has no dedicated endpoint; use `workspace-list`.
- **Idempotency.** Both `perform` actions are marked non-idempotent: create makes a new contact each
  time, and a field update can fire automations, so a blind retry could run them twice.
- **Icon.** Perspective publishes no SVG mark. `assets/icon.svg` embeds the vendor's own 256x256
  `apple-touch-icon.png` (from the site `<head>`) verbatim in an SVG wrapper; nothing was redrawn.

## Gotchas

1. **Pages start at 0.** `page=1` is the second page; paginate while `meta.hasNext` is true.
2. **`abTest` is a 400 on every chart except `chart_page_to_page_conversion_rate`.** The action
   refuses it before sending.
3. **`value` in Update Contact Value is always a string**, and `ps_*` metadata is reserved (400).
   `meta`, `utmParams` and `properties` cannot be set on create; write custom properties one at a
   time through the update action.
4. **No way to list questions.** `insight-get` needs the element id (`question_1234`) from the funnel
   builder; no endpoint enumerates them.
5. **Rate limit is 100 requests/minute**; a 429 body carries `retryAfter` seconds, which the error
   message reports.
