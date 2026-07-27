# Pipedrive

Manage Pipedrive deals, persons, organizations, activities, notes and leads through the REST API.

- **Categories** — crm
- **Auth methods** — api-token, oauth2
- **Actions** — 14
- **Egress allowlist** — `api.pipedrive.com`
- **API docs** — https://developers.pipedrive.com/docs/api/v1

## Actions

Fourteen actions across the six core CRM resources, built on `https://api.pipedrive.com/v1`.
Every response is Pipedrive's `{ success, data, additional_data }` envelope, returned verbatim.

| Resource | Actions |
|---|---|
| Deal | create, get, get-many, update, delete |
| Person | create, get-many, update, delete |
| Organization | create, get-many |
| Activity | create |
| Note | create |
| Lead | create |

The webhook trigger, file upload/download, and the `*/search` endpoints are deliberately out
of scope — the first is a Trigger rather than an Action, the second is a binary-stream surface,
and the search endpoints were dropped to hold the action count to the most-used CRUD operations.

## Auth

Two methods, signing differently:

- **api-token** (`apiKey`, `in: query`) — a personal API token from *Settings → Personal
  preferences → API*. Pipedrive does **not** accept it in an Authorization header; it travels
  as a `?api_token=<token>` query param, appended by the runtime's `apiKey` wiring (and mirrored
  in `sign` for direct callers).
- **oauth2** (`Bearer`) — a public OAuth flow against a Pipedrive OAuth app registered on this
  w6w installation. The authorize/token endpoints live on `oauth.pipedrive.com` (added to the
  auth hook's allowlist implicitly, so it is not restated in `network.allow`); the access token
  authenticates against the same `api.pipedrive.com/v1` base.

Both methods `test` with `GET /users/me`.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — declared absent.

status.pipedrive.com is **not** an Atlassian Statuspage — it is hosted by Sorry™
(sorryapp.com), which exposes no machine-readable surface we could verify. The Statuspage
`GET /api/v2/status.json`, `/rss`, `/feed`, `/history.rss`, `/notices.rss` and the page-level
JSON all return 404; the public page ships no `<link rel="alternate">` feed and no embedded
page id to reach the (key-gated) Sorry™ API. Verified 2026-07-27.

Declaring the absence is a positive fact, not an omission: a host can render "not knowable"
instead of leaving an operator to conclude the publisher forgot to wire a probe. A declared
absence always reports `unknown`, so it carries `severity: "informational"` — otherwise it
would pin every verdict for this app at `unknown` forever.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

Both auth methods probe:

```
GET /users/me
```

The current user — free, scope-free, and the smallest signed call Pipedrive offers.

### Do we have quota left?

`x-ratelimit-limit` / `-remaining` / `-reset` response headers meter a per-2-second **burst**
window; `x-daily-requests-left` reports the remaining daily **token budget** for write
endpoints (POST/PUT/DELETE), populated only for `api_token` auth. Header names verified against
the Pipedrive rate-limiting docs, 2026-07-27. Probed with the same `GET /users/me` call.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

**`service` is declared absent.** status.pipedrive.com is a Sorry™ status page with no
verifiable machine-readable surface. The derived `auth:*` credential check is the only
automatable liveness signal.

---

Researched and endpoint-verified 2026-07-27. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
