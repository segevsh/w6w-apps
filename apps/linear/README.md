# Linear

Create and manage Linear issues, comments, projects and labels through its GraphQL API.

- **Categories** — project-management, developer-tools
- **Auth methods** — api-key, oauth2
- **Actions** — 11
- **Triggers** — 4 (webhook)
- **Egress allowlist** — `api.linear.app`
- **Website** — https://linear.app
- **API docs** — https://linear.app/developers

## Triggers

Every trigger is a signed webhook trigger ([`rfcs/trigger.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/trigger.md)).
Activating one registers a webhook in Linear for you (the `webhookCreate` mutation) and removes it when
the trigger is deactivated (`webhookDelete`). Only a workspace admin, or an OAuth app with the `admin`
scope, can create or read webhooks, so the connection must be one of those.

| Trigger | Mechanism | Linear resource | The run gets |
|---|---|---|---|
| `issue` — Issue Event | webhook | `Issue` | action, issue, previous values on an update |
| `comment` — Comment Event | webhook | `Comment` | action, comment |
| `project` — Project Event | webhook | `Project` | action, project, previous values |
| `cycle` — Cycle Event | webhook | `Cycle` | action, cycle, previous values |

Every run also gets `resourceType`, `action` (`create`, `update`, `remove`), `deliveryId`
(`Linear-Delivery`), `id`, `url`, `actor`, `createdAt`, the record as `data` and, on an update,
`updatedFrom`. Each trigger takes an optional **Team** (blank watches every public team) and an
optional **Only these actions** list such as `create,update`.

**Trust model.** On activation a random 256-bit secret is generated per subscription and given to
Linear as the webhook's `secret`; it is kept in the subscription's state next to the webhook id.
Each delivery's `Linear-Signature` (hex HMAC-SHA256 of the exact request body) is checked in
constant time before the body is read, and the signed `webhookTimestamp` (milliseconds) must be
within 60 seconds of now, as Linear recommends against replays. A delivery with no signature, a
wrong one, a stale one, or no secret on record is refused and starts no run.

Vendor docs (verified 2026-11-09):
[Linear webhooks](https://linear.app/developers/webhooks) (create via API, securing webhooks) and
[Linear's GraphQL schema](https://github.com/linear/linear/blob/master/packages/sdk/src/schema.graphql)
(`WebhookCreateInput.secret`).

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.linear.app>

Human page only — no JSON API or feed was reachable.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
POST /graphql  ·  { viewer { id } }
```

The smallest possible GraphQL document. Linear has one endpoint and no REST surface, so
a query *is* the health check. Remember GraphQL answers 200 on failure — the probe
checks `errors[]` as well as the status.

### Do we have quota left?

`X-RateLimit-Requests-Limit` / `-Remaining` / `-Reset` response headers. Linear also
meters query complexity separately, under `X-Complexity-*`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

**`service` is declared absent.** status.linear.app is a human page with no JSON API or feed. The derived `auth:*` credential check is the only automatable liveness signal.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.


## Icon

`assets/icon.svg` — vector — replaces a 180px PNG.

Taken from <https://linear.app/static/favicon.svg> on 2026-08-15.

- **870 bytes**, `image/svg+xml`, md5 `3b15ba7e8fac94de88598f27741478de`
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the artwork
  inside the nested `<svg>` is the vendor's, verbatim

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
