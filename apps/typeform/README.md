# Typeform

Create and manage Typeform forms, responses, workspaces, themes and images via the Typeform APIs.

- **Categories** — forms, productivity
- **Auth methods** — personal-access-token, oauth2
- **Actions** — 10
- **Triggers** — 8 (3 webhook, 5 poll)
- **Egress allowlist** — `api.typeform.com`
- **Website** — https://www.typeform.com
- **API docs** — https://www.typeform.com/developers/

## Triggers

| trigger — title | mechanism | vendor event or wrapped list action | what the run gets |
|---|---|---|---|
| `new-response` — New Response | webhook (API-registered) | `form_response` | the response token, submit time, hidden fields and every answer |
| `new-partial-response` — New Partial Response | webhook (API-registered) | `form_response_partial` | the response token, start time and the answers given so far |
| `any-event` — Any Event | webhook (API-registered) | the `events` param: `form_response`, `form_response_partial` (both when empty) | the event type plus the response, as above |
| `new-form` — New Form | poll | `form-get-many`, `sort_by=created_at&order_by=desc` | the form's id, title, links and timestamps |
| `new-or-updated-form` — New or Updated Form | poll | `form-get-many`, `sort_by=last_updated_at&order_by=desc` | the same, once per edit |
| `new-workspace` — New Workspace | poll (snapshot) | `workspace-get-many` (all pages, 200 each) | the workspace's id, name, account and form count |
| `new-theme` — New Theme | poll | `theme-get-many` (documented newest-added first) | the theme's id, name, colors and font |
| `new-image` — New Image | poll | `image-get-many` (documented newest-added first) | the image's id, file name, URL and upload source |

Typeform's webhook catalog has exactly two events (create-or-update-webhook `event_types`):
`form_response` and `form_response_partial`. `new-response` keeps Typeform's default registration;
the other two webhook triggers register an explicit `event_types` object. **Any Event** reaches
both through one subscription and drops a delivery whose event was not asked for. Webhook triggers
need the form's id; the poll triggers need nothing but the connection (`new-form` and
`new-or-updated-form` accept an optional workspace id).

**Not a separate poll.** `response-get-many` returns the records `new-response` delivers (the
same form's submitted responses), so it is covered by that webhook trigger, which needs no dashboard
setup.

### Setup

Nothing to paste. Subscribing needs the form's id (`typeform.com/to/<id>`) and runs
`PUT /forms/{uid}/webhooks/{tag}` with a random per-subscription secret that is kept in the
subscription's state; unsubscribing runs `DELETE` on the same path (a webhook already gone counts as
deleted). The connection's token needs the `webhooks:read` and `webhooks:write` scopes; the OAuth flow requests both (Typeform OAuth scopes, developer doc checked 2026-11-09).

### Trust model

Every delivery's `Typeform-Signature` header (`sha256=` + base64 HMAC-SHA256 of the exact request
body, keyed by the subscription's secret) is verified before the body is parsed. A missing or wrong
signature, an absent raw body or an unset secret refuses the delivery (one failed row, no run).
Typeform's signature carries no timestamp, so there is no replay window.

Docs (verified 2026-11-10): https://www.typeform.com/developers/webhooks/, https://www.typeform.com/developers/webhooks/secure-your-webhooks/, https://www.typeform.com/developers/webhooks/reference/create-or-update-webhook/, https://www.typeform.com/developers/create/reference/retrieve-forms/, https://www.typeform.com/developers/create/reference/retrieve-workspaces/, https://www.typeform.com/developers/create/reference/retrieve-themes/, https://www.typeform.com/developers/create/reference/retrieve-images-collection/

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — Atlassian Statuspage.

```
GET https://status.typeform.com/api/v2/summary.json
```

Typeform runs a standard Atlassian Statuspage, so the `service` check reads the
`summary.json` rollup: `status.indicator` (`none` / `minor` / `major` / `critical`) plus
the per-component breakdown, so a single probe reports each component rather than one
platform-wide boolean. The check is unauthenticated and unsigned — `status.typeform.com`
is widened onto that hook's own allowlist and is deliberately absent from the app's egress
list, so no action can reach it.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

Both auth methods probe:

```
GET /me
```

Returns the authenticated account, needs no resource scope, and is the cheapest liveness
signal Typeform offers. `personal-access-token` sends a token minted in the Typeform admin
console; `oauth2` sends an access token from the OAuth flow. Both sign with `Bearer`.

### Do we have quota left?

Declared absent. Typeform enforces roughly **2 requests per second per account** on its
Create and Responses APIs, but that budget is enforced by a `429` — the responses carry no
`X-Rate-Limit-*` / `RateLimit-*` headers, so there is no live counter to read. Stated as a
positive fact rather than left as a gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:personal-access-token` | credential | connection | signed | fatal | — | derived from the `personal-access-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

**`quota` is declared absent.** Typeform publishes no headroom endpoint and returns no
rate-limit headers. A declared absence always reports `unknown`, so it carries
`severity: "informational"` — otherwise it would pin every verdict for this app at
`unknown` forever.

The host `status.typeform.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the
widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a status
host.

---

Researched and endpoint-verified 2026-07-27. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
