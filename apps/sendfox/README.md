# SendFox

Manage contacts, tags, lists, campaigns, forms and automations on the **SendFox** email-newsletter
platform for content creators, over its REST API.

- **Categories** — email, marketing
- **Auth methods** — personal-access-token
- **Actions** — 22
- **Health checks** — 2 (~~`service`~~, `quota`) + the derived `auth:personal-access-token`
- **Egress allowlist** — `api.sendfox.com` (the marketing/docs host `sendfox.com` is never called
  at runtime — it only hosts the OpenAPI document and the OAuth/token-management pages)
- **Website** — https://sendfox.com/
- **API docs / OpenAPI** — https://sendfox.com/openapi.yaml
- **Status page** — none published (see below)

> **Everything below was verified against SendFox's own OpenAPI 3.1 document on 2026-09-22**
> (`https://sendfox.com/openapi.yaml`, HTTP 200, `text/yaml`, 92,206 bytes, `info.title`
> "SendFox API", `info.version` 1.4.0), plus live unauthenticated/bad-token probes against
> `api.sendfox.com`. Nothing here came from a third-party integration directory.

## Auth: Personal Access Token, not the declared OAuth flow

The spec's `components.securitySchemes` formally declares a single scheme, `oauth2`
(`authorizationCode` flow, `authorizationUrl`/`tokenUrl` under `sendfox.com/oauth/*`). But the
spec's own `info.description` explains what API clients actually use:

> ### Personal Access Token
> Create a personal access token at https://sendfox.com/account/oauth. Once created, use it in the
> `Authorization` header:
> ```
> Authorization: Bearer {TOKEN}
> ```

This app is built against that model only — the user pastes in a static bearer token they mint on
that page. It does not implement the `authorizationCode` flow: that needs a redirect/browser dance
this sandbox can't model, and the vendor's own guidance names the PAT as the supported path for
third-party API integrations (the OAuth 2.0 client option is for "integrations that require user
authentication" — a different use case). One auth method is declared, `type: "bearer"`.

**API access is plan-gated.** The spec states outright: "API access requires a Lifetime or Empire
plan. Free users cannot use the API." A syntactically valid PAT from a free-plan account, or a
restricted account, is refused — `auth/personal-access-token.ts`'s `test` hook reports both cases
distinctly from the generic "bad token" message where the response body allows it (a structured
`403 account_restricted` body is checked for its `code` field).

## A 401 cannot say "missing" from "wrong"

Measured live 2026-09-22 against `GET /me`: a request with **no** `Authorization` header and a
request with a syntactically plausible **fake** bearer token both answer the byte-identical
`401 {"message":"Unauthenticated."}` (25 bytes) — same trap documented for TidyCal in this pack's
house rules. There is no field-level signal to tell "the credential never reached the request" from
"the credential is wrong", so `test`'s message names both possibilities rather than pretending to
distinguish them, and the credential-liveness check always classifies by parsing the response body
(does a `200` actually look like a `User` — an object with a non-empty `email`?), never by status
code alone.

## Response envelopes — two shapes, plus one count-only special

Per SendFox's own description, errors follow "Laravel's default error format":
`{"message": "...", "errors": {...}}`, with `errors` present only on 422 validation responses.
Success responses are not uniform:

- **Collections** answer a Laravel paginator: `{data: [...], current_page, total, per_page}`.
- **Single-resource reads/writes** answer the **bare entity** — `GET /contacts/{id}` is a `Contact`,
  `GET /me` is a `User`, and both `POST /contacts` and `PATCH /contacts/{id}` return a `Contact`.
- `GET /contacts?count_only=true` answers a **third** shape, `{count, filter}`, instead of a page —
  the cheapest way to size an audience before acting on it.

`lib/client.ts`'s `SendfoxClient.json` never unconditionally unwraps a `data` key for exactly this
reason — a client that did would silently return `undefined` for every single-resource endpoint.

## `lists` on a contact update REPLACES, it does not add

`PATCH /contacts/{id}`'s `lists` field is documented as "Array of list IDs (replaces all current
list memberships)". `actions/contact-update.ts` sends it as a set operation, not an add — an empty
array is honoured (removes the contact from every list) rather than treated as "unset". To add one
list membership without disturbing the others, use `List: Add Contact`
(`POST /lists/{list_id}/contacts`, `actions/list-contacts-add.ts`).

## Health checks

**No vendor status page exists.** Checked live 2026-09-22:

| Host | Result |
|---|---|
| `status.sendfox.com` | DNS failure (NXDOMAIN) |
| `sendfoxstatus.com` | DNS failure (NXDOMAIN) |
| `sendfox.statuspage.io` | 302 to the generic `statuspage.io` marketing site — unclaimed |
| `sendfox.instatus.com` | 307 to the generic `instatus.com` marketing site — unclaimed |

`health/service.ts` declares this as a positive fact (`unavailable`) at `severity: "informational"`
— per `rfcs/healthcheck.md`'s "declaring absence" — so the app is never pinned at `unknown` health
by a check that can never fire. Reachability is instead answered by the derived
`auth:personal-access-token` check (a real authenticated `GET /me`).

`health/quota.ts` is a **real, live** check: SendFox documents 60 requests/minute per authenticated
user and returns `X-RateLimit-Limit`/`X-RateLimit-Remaining` on every response (`Retry-After` on a
429). Both checks read the same `GET /me` call (`minIntervalSeconds: 60` keeps the cost to once a
minute); `/me` was chosen for the read because it needs no id and returns nothing beyond account
metadata (no proxy password, no API key — unlike Follow Up Boss's `/me` or Mailjet's `/apikey`,
which are banned pack-wide for exactly that reason).

## Actions

**Contacts** — `contact-list` (with SendFox's full `filter[...]` engagement set and `count_only`),
`contact-get`, `contact-create`, `contact-update`, `contact-delete`, `contact-activity-get`,
`contact-unsubscribe` (by email, not id).

**Contact tags** — `contact-tag-list`, `contact-tag-create`, `contact-tag-add`,
`contact-tag-remove`.

**Campaigns** — `campaign-list`, `campaign-get`, `campaign-create`, `campaign-send`,
`campaign-stats-get`.

**Lists** — `list-list`, `list-create`, `list-contacts-add`.

**Forms** — `form-list`, `form-create`.

**Automations** — `automation-list`.

**Account** — `me-get`.

### Not yet covered

The spec also documents contact batch/bulk-action endpoints, custom contact fields
(`/contact-fields`), campaign templates/sections, domain whitelabeling (`/domains`), automation
emails (`/automation-emails`), and update/delete on campaigns, lists, forms and automations. None of
these were confirmed against a live response and none is invented here — add them in a follow-up
pass against the live spec rather than guessing at their shapes.
