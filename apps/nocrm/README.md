# noCRM.io

Manage noCRM.io leads, comments, client folders, users, teams, pipelines, steps, categories,
predefined tags and webhooks.

- **Categories** — crm, communication
- **Auth methods** — api-key, user-token
- **Actions** — 21
- **Egress allowlist** — `*.nocrm.io`
- **Website** — https://www.nocrm.io
- **API docs** — https://www.nocrm.io/api

## Auth scheme

noCRM.io documents **two separate credential grants**, not one field with a mode switch, so this
app ships two `AuthDefinition`s:

- **API Key** (`X-API-KEY`, header) — account-level. "It is for the account and it grants you
  admin rights." A lead created with it and no `user_id` becomes unassigned. Required by the
  Simplified API (`/api/simple/...`), which this app's `lead-add-tag` and `lead-log-activity`
  actions use.
- **User Token** (`X-USER-TOKEN`, header) — user-dependent. "All the requests will use the
  privacy of the users and some requests won't be allowed depending of the user rights." At least
  one documented parameter is explicitly refused under this scheme: `lead-create`'s `userId`
  "returns an error in case you are using the login user method to authenticate (USER token)".

Both are verified live against **`https://www.nocrm.io/api`**'s Authentication section (read in
full 2026-09-22).

Like `apps/gorgias`, every noCRM account has its own host — `https://YOUR_SUBDOMAIN.nocrm.io` —
so the subdomain is collected as a Connection field on both auth methods, not an Action param, and
echoed onto the Connection's `display` by `afterConnect`; `lib/client.ts` reads it from there.
`w6w.network.allow` declares the wildcard `*.nocrm.io`, matching that pattern.

## Errors

Every failing endpoint answers `{"error": <code>, "message": <prose>, "type": <machine code>}`.
The document is explicit that `type` — not the status code, and not `message`, which it warns can
change — is "the attribute to test if you want to do a specific process when it happens". This app
follows that: `lib/client.ts#formatNocrmError` always quotes `type` when present, and every auth
`test`/health probe classifies from the body.

A `429` additionally carries `API-RETRY-AFTER` and `API-LIMIT-RESET` response headers; the
document warns that continuing to call a throttled API "might deactivate the API key used or
[block] the account" — `formatNocrmError` repeats that guidance on a 429.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and is *this account's own host* reachable.

### Is the vendor up?

**Declared absence.** Checked live 2026-09-22:

- `https://status.nocrm.io` → 302 to `nocrm.io/sessions/signin?flash_error=Compte+introuvable`
  ("account not found"), landing on noCRM's own per-tenant **login page**
  (`<title>Login</title>`). Because every account gets a wildcard `*.nocrm.io` host, "status" is
  simply being read as a nonexistent tenant name by the product's own routing — this is not a
  status page.
- `https://status.nocrm.io/api/v2/summary.json` (the conventional Statuspage path) →
  `401 {"error":401,"message":"Unauthorized: invalid api_key","type":"unauthorized_invalid_token"}`
  — the API's own auth-error body, not Statuspage JSON.
- No `status`/`statuspage`/`instatus` link anywhere in the footer or nav of `www.nocrm.io` or
  `help.nocrm.io`; the obvious third-party aliases (`nocrm.statuspage.io`, `nocrmio.instatus.com`)
  are unclaimed pages that redirect elsewhere, not branded status boards for this product.

`health/service.ts` declares this absence (`severity: "informational"`, `unavailable.reason`)
rather than wiring up any of the above. `informational` is load-bearing: an `unavailable` entry
always reports `unknown`, and `unknown` outranks `ok` in a roll-up, so any stronger severity would
pin the app's verdict at `unknown` forever.

### Is this credential live?

This is what each Auth method's `test` hook does, projected automatically into the health surface
as `auth:api-key` and `auth:user-token`.

Both probe:

```
GET /api/v2/ping
```

with their own header. The document's own success body —
`{"status":200,"message":"Your API key is correct."}` — is a whoami that echoes no credential.
Failure is classified from the body's `type` field (every documented refusal is an
`unauthorized_*` type: `unauthorized_missing_token`, `unauthorized_disabled_token`,
`unauthorized_invalid_token`), never from the bare status code.

### Is this account's own host reachable?

`health/subdomain.ts` — a `kind: "dependency"`, `scope: "connection"`, `credential: "context"`
check, the same idiom `apps/gorgias/health/domain.ts` uses for its own per-tenant host. It sends
an **unsigned** `GET /api/v2/ping` and reads the vendor's `type` field, because noCRM serves the
whole `*.nocrm.io` wildcard from one shared origin, so a bare HTTP status alone cannot tell "an
account lives here" apart from "nothing does". Verified live 2026-09-22, with no credential at
all:

| Probe | Status | `type` | Meaning |
|---|---|---|---|
| a real subdomain | 401 | `unauthorized_missing_token` | an account is there — it just wants a credential (→ `ok`) |
| an invented subdomain | 401 | `unauthorized_invalid_token` | nothing answers for that name (→ `down`) |
| a real but billing-lapsed subdomain (`demo`) | 402 | `suspended_account` | the account exists but its subscription has lapsed (→ `degraded`) |
| a non-API host (`help.nocrm.io`) | 404 | — (HTML) | something else entirely answers there (→ `down`) |

Signing this probe would be wrong: sending any key turns the "account is there" answer into
`unauthorized_invalid_token` too, making every healthy account look like a missing one — which is
why `credential: "context"` and an unsigned request are load-bearing here, not just tidy.

### Do we have quota left?

**Declared absence.** The document's Errors section describes only the *refusal*: a `429`
response carries `API-RETRY-AFTER` and `API-LIMIT-RESET` headers "to let you know when you can
restart doing requests". There is no documented header carrying **remaining** allowance on a
normal (non-429) response, and no endpoint that reports it, so `health/quota.ts` declares the
absence (`severity: "informational"`) rather than inventing a figure. Headroom can only be
inferred from an observed 429, which `lib/client.ts`'s error formatter surfaces when it happens.

## Declared health checks

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | `health/service.ts` (declared absence) |
| `quota` | quota | app | none | informational | — | `health/quota.ts` (declared absence) |
| `subdomain` | dependency | connection | context | degraded | 120s | `health/subdomain.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |
| `auth:user-token` | credential | connection | signed | fatal | — | derived from the `user-token` auth method's `test` hook |

## Actions

| Key | Method + path | Notes |
|---|---|---|
| `lead-create` | `POST /v2/leads` | `title`+`description` required; optional assign/step/tags/`created_at` |
| `lead-get` | `GET /v2/leads/:id` | |
| `lead-get-many` | `GET /v2/leads` | every documented filter (status, step, tags, owner, email, `field_key`/`field_value`, `updated_after`) plus `limit`/`offset` paging |
| `lead-update` | `PUT /v2/leads/:id` | partial body, same shape as create |
| `lead-delete` | `DELETE /v2/leads/:id` | |
| `lead-get-unassigned` | `GET /v2/leads/unassigned` | |
| `lead-add-tag` | `GET /simple/leads/:id/add_tag` | Simplified API — a documented GET that mutates; API-key connections only |
| `lead-log-activity` | `GET /simple/leads/:id/add_activity` | Simplified API, same constraint |
| `lead-comment-create` | `POST /v2/leads/:id/comments` | |
| `lead-comment-get-many` | `GET /v2/leads/:id/comments` | |
| `client-folder-create` | `POST /v2/clients` | |
| `client-folder-get-many` | `GET /v2/clients` | |
| `user-get` | `GET /v2/users/:id` | id or email |
| `user-get-many` | `GET /v2/users` | |
| `team-get-many` | `GET /v2/teams` | |
| `pipeline-get-many` | `GET /v2/pipelines` | |
| `step-get-many` | `GET /v2/steps` | |
| `category-get-many` | `GET /v2/categories` | optional `include_tags` |
| `predefined-tag-get-many` | `GET /v2/predefined_tags` | |
| `webhook-create` | `POST /v2/webhooks` | `event`/`target_type`/`target` required, `name` optional; same triple is unique per account (a repeat 409s with the existing id, so a retry cannot duplicate) |
| `webhook-get-many` | `GET /v2/webhooks` | API-key connections only (`not_api_key` under a user token) |

Every list endpoint answers a **bare JSON array**; the document's own `X-TOTAL-COUNT` header (the
count before pagination) arrives out of band, so `NocrmClient.list` returns `{ items, totalCount }`
instead of dropping it. Only `GET /v2/leads` documents its own `limit`/`offset` — the rest of this
app's list endpoints expose no paging params, matching the document.

## Deviations and scope

noCRM's own docs describe a larger surface than the 21 actions above. Deliberately left out, with
why:

- **`GET /webhook_events`** (list all webhook event names) — the document lists the event
  vocabulary in prose ("List of events") well enough to attach as a hint on `webhook-create`;
  listing it live added no action a workflow author needs.
- **`get_all_contacts`** — needs a second `X-API-PARTNER-KEY` credential and belongs to a
  VOIP-partner integration feature, a different auth surface than this app's own two schemes.
- **The Simplified API's shortcut endpoints** (`duplicate-lead`, `assign-lead-*` variants,
  `change-lead-status-to-*`, the template/custom email senders) and the `/v2` lead sub-resources
  (`duplicate_lead`, `assign`, business card, calls, attachments, action history, post-sales
  tasks) — out of scope for this pass; the reviewed surface stays close to this pack's usual
  per-app action count (compare `apps/gorgias`'s 22).
- **`health/service.ts` and `health/quota.ts`** are declared absences, not gaps — see Health check
  above for the live evidence.

---

Researched and endpoint-verified 2026-09-22 against `https://www.nocrm.io/api` (read in full — a
static, server-rendered Slate page) and live probes against real and invented `*.nocrm.io`
subdomains.
