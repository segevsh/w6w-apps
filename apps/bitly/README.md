# Bitly

Shorten, manage and track Bitly links via the Bitly REST API v4.

- **Categories** — marketing, analytics
- **Auth methods** — access-token
- **Actions** — 8
- **Egress allowlist** — `api-ssl.bitly.com`

## Actions

| Key | Type | Resource | Endpoint |
|---|---|---|---|
| `create-bitlink` | perform | bitlink | `POST /bitlinks` |
| `get-bitlink` | read | bitlink | `GET /bitlinks/{bitlink}` |
| `update-bitlink` | perform | bitlink | `PATCH /bitlinks/{bitlink}` |
| `list-bitlinks` | search | bitlink | `GET /groups/{group_guid}/bitlinks` |
| `expand-bitlink` | read | bitlink | `POST /expand` |
| `get-bitlink-clicks` | read | bitlink | `GET /bitlinks/{bitlink}/clicks` |
| `get-bitlink-clicks-summary` | read | bitlink | `GET /bitlinks/{bitlink}/clicks/summary` |
| `list-groups` | search | group | `GET /groups` |

`create-bitlink` is **not** marked idempotent: whether re-POSTing an already-shortened
`long_url` returns the existing Bitlink or mints a new one isn't documented clearly enough
to assert either way, so retries are treated conservatively as new creates. `update-bitlink`
**is** idempotent — re-applying the same field values converges on the same end state.
`expand-bitlink` is modelled as `type: "read"` even though Bitly implements it as a `POST`,
because it is a side-effect-free lookup (Action `type` reflects intent, not HTTP verb — see
`rfcs/action.md`). `list-bitlinks` is scoped to one group at a time (Bitly has no
whole-account listing endpoint) and cursor-paginated via `search_after`; pass a listing's
`nextSearchAfter` back in as `searchAfter` to keep walking. `list-groups` exists so a caller
can discover the `groupGuid` the other bitlink actions need — every account has at least one
group (its default).

## Auth

**Generic Access Token** (`bearer`) — a single long-lived token generated at
`bitly.com/settings/api`, sent as `Authorization: Bearer <token>`. This is the credential
Bitly's own docs call the "Generic Access Token"; it needs no OAuth flow, and the credential
is the whole story. Bitly also supports full OAuth2 for multi-tenant integrations, but its
exact authorize/token endpoint URLs weren't confirmed against Bitly's own docs during this
build (the WebFetch tooling available couldn't retrieve that section reliably), so only the
access-token method is implemented here. Add an `oauth2` auth method once those URLs are
verified directly.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.bitly.com>, an Atlassian Statuspage-powered page with a
machine-readable Atom feed at `https://status.bitly.com/history.atom`. Declared via `feed`
rather than hand-parsed: the host fetches and parses it, this app only interprets entries
(Statuspage prefixes each update with its status word — `Resolved`, `Investigating`,
`Monitoring` — so an incident whose newest entry doesn't start with "Resolved" is still open).

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The `access-token` auth method probes:

```
GET /user
```

Documented as returning the authenticated user's own account info; needs no scope beyond
the token itself.

### Do we have quota left?

No documented rate-limit response headers. Bitly's rate-limit docs describe HTTP 429 with
error codes (`RATE_LIMIT_EXCEEDED`, `API_USAGE_LIMIT_EXCEEDED`) and mention usage-inspection
endpoints (`GET /user/platform_limits`, `GET /groups/{group_guid}/feature_usage`), but their
exact response shapes weren't confirmed precisely enough against the vendor's own docs during
this build to wire a check honestly. Declared absent rather than guessed at.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 300s | `feed`: `status.bitly.com/history.atom` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:access-token` | credential | connection | signed | fatal | — | derived from the `access-token` auth method's `test` hook |

**`quota` is declared absent.** See "Do we have quota left?" above. A declared absence
always reports `unknown`, so it carries `severity: "informational"` — otherwise it would pin
every verdict for this app at `unknown` forever.

## Deviations from the spec brief

- **OAuth2 omitted.** The spec brief allowed a plain Bearer "Generic Access Token" in
  preference to full OAuth2 "unless you can verify OAuth2's exact URLs" — they weren't
  verified here, so only the access-token method is implemented.
- **`quota` health check declared absent** rather than wired to Bitly's usage-inspection
  endpoints, per the spec brief's bar of "genuinely verifiable rate-limit headers" — none are
  documented, and the two usage endpoints that do exist weren't confirmed field-by-field
  against the vendor's own docs.

---

Researched and endpoint-verified 2026-08-01 against `dev.bitly.com/api-reference/`,
`dev.bitly.com/docs/getting-started/`, `status.bitly.com`, and cross-checked against n8n's
production Bitly node (`api-ssl.bitly.com/v4`, Bearer "Generic Access Token"). Status
surfaces move; re-check with `_tools/audit.ts` conventions in mind if a probe starts failing
for everyone at once.
