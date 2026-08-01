# UptimeRobot

Manage monitors and alert contacts, and check account status, via the UptimeRobot API v2.

- **Categories** — monitoring
- **Auth method** — api-key (`apiKey`, body-located)
- **Actions** — 8
- **Egress allowlist** — `api.uptimerobot.com`
- **API docs** — https://uptimerobot.com/api/legacy/ (the v2 API; UptimeRobot's newer v3 REST
  API exists but was not used here — see "Why v2" below)

## Actions

Eight actions across three resources, all on `https://api.uptimerobot.com/v2` (every call is
`POST`, form-urlencoded, regardless of whether it reads or writes):

- **account** — `account-get`
- **monitor** — `monitor-list`, `monitor-get`, `monitor-create`, `monitor-update`,
  `monitor-delete`, `monitor-reset`
- **alert-contact** — `alert-contact-list`

`monitor-get` has no dedicated endpoint of its own: UptimeRobot's `getMonitors` is a single
"Swiss-Army knife" method that lists every monitor by default and narrows to one when given a
single id via `monitors=<id>` — `monitor-list` and `monitor-get` both call it, and `monitor-get`
unwraps the one-element array. This app also does not wrap the maintenance-window (`*MWindow`)
or public-status-page (`*PSP`) endpoint families UptimeRobot's API otherwise exposes — they're
real endpoints, just outside the eight actions this app's spec called for (account, monitor
CRUD+reset, alert contacts).

Built directly from n8n's `UptimeRobot` reference node
(`nodes-base/nodes/UptimeRobot/{UptimeRobot.node.ts,MonitorDescription.ts,
AlertContactDescription.ts,GenericFunctions.ts}` and
`credentials/UptimeRobotApi.credentials.ts`) and cross-checked directly against UptimeRobot's own
published v2 docs (`uptimerobot.com/api/legacy/`, fetched 2026-08-01) — every endpoint path, verb,
and body field below was verified against that page's own parameter tables and worked examples,
not assumed from the node alone.

### Why v2, not v3

UptimeRobot now publishes a newer v3 REST API (`uptimerobot.com/api/v3/`) alongside the legacy v2
API this app uses. v2 was chosen because it is what this app's spec named explicitly (`POST
/v2/getAccountDetails` for `test`) and what n8n's reference node targets — and, unlike v3, its
unusual body-located auth is exactly the case this app exists to demonstrate handling correctly.
v2 remains fully documented and operative; UptimeRobot's own docs mark it legacy, not deprecated
or scheduled for removal.

## Auth

### API Key (`apiKey`, body-located)

This is the one thing about UptimeRobot's API worth over-explaining, because it breaks the
pattern every other app in this pack follows.

**The API key is a form-urlencoded *body* field, `api_key`, on every request — never an
`Authorization` header, and (with one documented exception this app does not use,
`getMonitors` as a query param) never a query parameter either.** Verified directly against
UptimeRobot's own v2 docs (`uptimerobot.com/api/legacy/`, fetched 2026-08-01): *"While making a
request, you must send the api_key in your request's body."* Every single worked example on that
page confirms it — `curl -X POST -H "Content-Type: application/x-www-form-urlencoded" -d
'api_key=enterYourAPIKeyHere&format=json&...' https://api.uptimerobot.com/v2/getAccountDetails`.
n8n's own `UptimeRobotApi.credentials.ts` encodes the identical shape
(`authenticate.properties.body.api_key`).

Every other Auth method in this pack (see Toggl's `basic`, or `fixtures/apps/sendgrid`'s
`apiKey`) injects the credential into a request **header** — a location `SignableRequest.headers`
(a `Record<string, string>`) models directly, so `sign` just does `request.headers["authorization"]
= ...`. A form-body key has nowhere else to go: `SignableRequest.body` is a plain `string | null`
(the wire bytes, not a parsed structure — see `@w6w/types` `hooks.ts`), so injecting into it means
*editing serialized form-urlencoded text*, not setting a map entry.

`auth/api-key.ts`'s `sign` hook does exactly that:

```ts
sign({ request, credential }) {
  const { apiKey } = credential as { apiKey: string };
  const params = new URLSearchParams(request.body ?? undefined);
  params.set("api_key", apiKey);
  if (!params.has("format")) params.set("format", "json");
  request.body = params.toString();
  request.headers["content-type"] = "application/x-www-form-urlencoded";
  return request;
}
```

1. **Parse** the action's already-built body — `new URLSearchParams("")` for an action with no
   fields of its own (`account-get`), or e.g. `"friendly_name=Foo&type=1"` for `monitor-create`.
   `URLSearchParams` round-trips form-urlencoded text losslessly, so this is exact, not a
   reimplementation of the encoding.
2. **Merge in** `api_key` and, if the action didn't already set one, `format=json` — so no action
   needs to remember either field. Actions never set `api_key` or `format` themselves; every
   action's own body-building code sends only its own fields (see any `actions/*.ts` `execute`).
3. **Re-serialize** onto `request.body`, and stamp `content-type` for good measure (the action
   already sets it too — this just keeps `sign` correct standalone, matching how the header case
   would set its own header regardless of what the action did).

This keeps the credential-isolation invariant intact even though the mechanics differ: `sign`
still runs in its own network-less worker, still never lets the action see the raw key, and still
never lets the key reach the network except by being written into the one request the host
actually sends.

`apiKey: { in: "body", name: "api_key" }` records this location declaratively — `ApiKeyConfig.in`
supports `"body"` alongside `"header"`/`"query"` in `@w6w/types`. That block is metadata for
`describe()`/UI purposes only; exactly as for every other Auth method in this pack (Toggl's
`basic`, SendGrid's `apiKey`), the runtime never auto-signs from the declared `type` — `sign` is
always the hand-written source of truth for what actually goes on the wire.

Fields: `apiKey` (secret, required) — generate one from **My Settings → API Settings → Main API
Key** on uptimerobot.com. This app collects the **account-specific** key (the kind that can use
every method on every monitor); UptimeRobot also issues monitor-specific and read-only key
variants, but the docs describe those as narrower views of the same mechanism, not a different
auth flow.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Declared absent**, after checking directly rather than assuming a monitoring company must
publish one. `status.uptimerobot.com` exists, but checked directly (2026-08-01) it turns out to be
UptimeRobot's own **Public Status Page product**, dogfooded for itself — the same product this
app's spec deliberately does *not* wrap (the `*PSP` endpoint family) — not an incident feed for
UptimeRobot's own infrastructure:

- `GET https://status.uptimerobot.com/` returns 200 but sets a `psp_session` cookie and renders a
  client-side SPA shell ("There was an error while fetching the data" without JS) — a customer
  status page, not a status API.
- `GET https://status.uptimerobot.com/api/v2/summary.json` — the conventional Atlassian
  Statuspage path this pack's other apps use (see Toggl) — 301-redirects to `uptimerobot.com`'s
  marketing site and 404s there.
- `/history.atom`, `/history.rss`, `/rss`, `/feed` all 404.

No JSON status API and no Atom/RSS feed exist at any conventional location, so this is declared
`unavailable` (`health/service.ts`) rather than wired to a URL that only coincidentally responds.
There is some irony in a monitoring vendor publishing no machine-readable status surface of its
own — but an honest absence is the point of this field, not something to paper over.

### Is this credential live?

This is what the Auth `test` hook does — the derived `auth:api-key` health check, exactly as for
every app in this pack:

```
POST /v2/getAccountDetails
```

### Do we have quota left?

**Real, and verifiable** — unusually for this pack, UptimeRobot documents exactly this. Verified
directly against UptimeRobot's own v2 docs ("Rate Limits" section): every response carries
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (epoch seconds), and — on a 429
— `Retry-After`. Limits are plan-based (Free: 10 req/min; paid: `monitor_limit * 2` req/min,
capped at 5000 req/min). `health/quota.ts` reads these headers off a `getAccountDetails` call (the
same cheap endpoint the derived credential check already uses, rather than spending a second
request purely to read headers) and reports:

- `state: "down"` on an actual 429, with `Retry-After` surfaced in the message.
- `state: "degraded"` when `X-RateLimit-Remaining` is `0` but the call still succeeded.
- `state: "unknown"` when the headers are simply absent from a response (declared, not
  fabricated — the docs describe the headers but a live response not echoing them should not be
  read as "zero quota") or on a non-429 HTTP failure.
- `state: "ok"` with the reading otherwise.

`severity: "informational"` — this never worsens a roll-up verdict on its own.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | degraded | declared absence (`unavailable`) |
| `quota` | quota | connection | signed | informational | `health/quota.ts`, reads `X-RateLimit-*` off `getAccountDetails` |
| `auth:api-key` | credential | connection | signed | fatal | derived from the `api-key` auth method's `test` hook |

## Icon

`assets/icon.svg` is the real UptimeRobot mark, copied unmodified from n8n's
`nodes-base/nodes/UptimeRobot/uptimerobot.svg` — no icon was invented for this app.

---

Researched and endpoint-verified 2026-08-01 directly against UptimeRobot's own published v2 API
docs (`uptimerobot.com/api/legacy/`), cross-checked against n8n's `UptimeRobot` reference node and
against the community `bitfield/uptimerobot` Go client's response-envelope handling
(`stat`/`error` shape). Status surfaces and undocumented behavior move; re-check if a probe starts
failing for everyone at once.
