# monday.com

Boards, groups, items and columns on monday.com via its GraphQL API.

- **Categories** — project-management, productivity
- **Auth methods** — api-token, oauth2
- **Actions** — 14
- **Egress allowlist** — `api.monday.com`
- **Website** — https://monday.com
- **API docs** — https://developer.monday.com/api-reference/docs

monday has no REST surface: every call is a GraphQL `POST https://api.monday.com/v2`
with a `{ query, variables }` body, so `lib/client.ts` is a GraphQL client and each
action owns its query/mutation. Two traps worth knowing: GraphQL answers **200 on
failure** (problems land in `errors[]`, which the client checks), and column values are
a **`JSON` scalar passed as a string** (`jsonArg` validates and re-encodes the caller's
JSON before it goes on the wire). The client pins `API-Version: 2024-10` so a schema
change never surprises a running workflow.

### Actions

- **board** — `board-create`, `board-get`, `board-get-many`, `board-archive`
- **group** — `group-create`, `group-get-many`, `group-delete`
- **item** — `item-create`, `item-get`, `item-get-many`, `item-change-column-values`,
  `item-delete`, `item-move`
- **column** — `column-get-many`

`board_id` and `item_id` are `ID`s; `group_id` and `column_id` are string keys
(`topics`, `status`). The `*-get-many` lookups exist to discover them.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — Atlassian Statuspage, machine-readable.

```
GET https://status.monday.com/api/v2/summary.json
```

`status.monday.com` is a standard Statuspage: `status.indicator` (`none` / `minor` /
`major` / `critical`) drives the rollup and `components[]` carries a per-component
breakdown, so one call reports many things. The host is added to this hook's own
`network.allow` and is deliberately **not** on the app's egress allowlist — an action
has no business calling a status page, and the spec permits widening egress for an
unsigned check only. Verified 2026-07-27: the endpoint resolves and returned
`indicator: "none"`, `description: "All Systems Operational"`.

### Is this credential live?

This is what each Auth `test` hook does — the app's own health check, and the only one
of the three it performs itself. Both auth methods probe:

```
POST /v2   ·   { me { id name } }
```

The cheapest identity query monday offers.

### Do we have quota left?

monday does **not** meter in a simple `X-RateLimit-*` header. Its real budget is **query
complexity**: every account has a complexity allowance per rolling window, and a call can
ask what remains by selecting the top-level `complexity` object —

```
POST /v2   ·   { complexity { before after reset_in_x_seconds } }
```

`after` is the budget left now, `before` the ceiling just before the probe, and
`reset_in_x_seconds` when the window rolls over. That object IS the honest quota signal,
so the `quota` check reads it rather than inventing a header monday does not send. (On a
429 monday also returns `Retry-After` and a `retry_in_seconds` error field, but the
complexity object is the forward-looking headroom, not a post-hoc backoff.) Verified
against https://developer.monday.com/api-reference/docs/complexity on 2026-07-27.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.monday.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the
widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a status
host.

---

Researched and endpoint-verified 2026-07-27. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
