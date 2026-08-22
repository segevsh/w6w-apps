# SurveyMonkey

Create and manage SurveyMonkey surveys, responses, collectors and contacts via the
SurveyMonkey API.

- **Categories** — forms, productivity
- **Auth methods** — oauth2
- **Actions** — 12
- **Egress allowlist** — `api.surveymonkey.com`

## Links

- **Website** — https://www.surveymonkey.com
- **API docs** — https://developer.surveymonkey.com/api/v3/ (endpoint reference researched
  against the vendor's own [`SurveyMonkey/public_api_docs`](https://github.com/SurveyMonkey/public_api_docs)
  GitHub repo, which mirrors that portal's content as markdown)
- **GitHub** — https://github.com/SurveyMonkey/public_api_docs

## Actions

| Resource | Action | Endpoint |
|---|---|---|
| survey | Get Many Surveys | `GET /surveys` |
| survey | Get Survey | `GET /surveys/{id}` |
| survey | Get Survey Details | `GET /surveys/{id}/details` |
| survey | Create Survey | `POST /surveys` |
| response | Get Many Responses (Bulk) | `GET /surveys/{id}/responses/bulk` |
| response | Get Response Details | `GET /surveys/{id}/responses/{response_id}/details` |
| collector | Get Many Collectors | `GET /surveys/{id}/collectors` |
| collector | Create Collector | `POST /surveys/{id}/collectors` |
| page | Get Many Survey Pages | `GET /surveys/{id}/pages` |
| user | Get Current User | `GET /users/me` |
| contact-list | Get Many Contact Lists | `GET /contact_lists` |
| contact | Add Contact | `POST /contact_lists/{id}/contacts` |

Deliberately absent: survey/collector/response **webhooks** (a Trigger, not an Action) and
the write side of responses — SurveyMonkey's `responses_write` scope ("Create/Modify
Responses") needs the vendor's approval to use in a Public app, and this pack has no use
case yet that needs it.

## Auth

**OAuth 2.0** only. `client_id` / `client_secret` / `redirect_uri` live on the w6w server,
not in this package.

```
Authorize: https://api.surveymonkey.com/oauth/authorize
Token:     https://api.surveymonkey.com/oauth/token
```

Scopes are limited to what this app's actions actually use: `users_read`, `surveys_read`,
`surveys_write`, `responses_read`, `responses_read_detail`, `collectors_read`,
`collectors_write`, `contacts_read`, `contacts_write`. SurveyMonkey sends `scope` as a
**comma-separated** list rather than the OAuth-default space (`scopeSeparator: ","`),
verified against the vendor's own OAuth credential wiring.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — Atlassian Statuspage.

```
GET https://status.surveymonkey.com/api/v2/summary.json
```

SurveyMonkey runs a standard Atlassian Statuspage, so the `service` check reads the
`summary.json` rollup: `status.indicator` (`none` / `minor` / `major` / `critical`) plus
the per-component breakdown. The check is unauthenticated and unsigned —
`status.surveymonkey.com` is widened onto that hook's own allowlist and is deliberately
absent from the app's egress list, so no action can reach it.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three questions the app performs directly on every Connection.

```
GET /users/me
```

Returns the authenticated user, needs no resource scope beyond `users_read`, and is the
cheapest liveness signal SurveyMonkey offers. Signs with `Bearer`.

### Do we have quota left?

**Real probe.** Unlike many vendors in this pack, SurveyMonkey publishes live rate-limit
headers, so `quota` reads them off the same `GET /users/me` call the auth `test` hook
already makes rather than spending a second, dedicated request:

```
X-Ratelimit-App-Global-Minute-Limit / -Remaining / -Reset
X-Ratelimit-App-Global-Day-Limit / -Remaining / -Reset
```

Draft/Private apps are capped at **120 requests/minute** and **500 requests/day**; Public
apps published in the App Directory face no such cap. The daily budget resets at 00:00
GMT. Both windows are **app-global** — shared across every user of this OAuth
application, not scoped to one Connection — and the `*-Reset` headers are documented as
seconds-from-now, not an epoch instant, so the check converts them with
`Date.now() + seconds * 1000`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 60s | `health/quota.ts` |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.surveymonkey.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the
widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a status
host.


## Icon

`assets/icon.svg` — the vendor's own icon, complete with the disc the bare glyph was missing.

Taken from <https://prod.smassets.net/assets/static/images/surveymonkey/favicon.svg> on 2026-08-15.

- **2,436 bytes**, `image/svg+xml`, md5 `da6d598837926247beef73b235fbc57d`
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the artwork
  inside the nested `<svg>` is the vendor's, verbatim

---

Researched and endpoint-verified 2026-08-02 against `SurveyMonkey/public_api_docs` (the
vendor's own markdown source for https://developer.surveymonkey.com/api/v3/) and
cross-checked against n8n's `SurveyMonkeyOAuth2Api` / `SurveyMonkeyTrigger` node source for
the OAuth endpoint pair, scope names, and the `data`-wrapped list envelope. Status surfaces
move; re-check with `_tools/audit.ts` conventions in mind if a probe starts failing for
everyone at once.
