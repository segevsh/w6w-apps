# PostBin

Create disposable bins that collect any HTTP request sent to them, for testing API clients and
webhooks.

- **Categories** — developer-tools
- **Auth methods** — none (PostBin is a genuinely anonymous, no-auth service)
- **Actions** — 5
- **Egress allowlist** — `www.postb.in`

## What PostBin is

[PostBin](https://www.postb.in) is a small utility service: create a **bin**, get back a
throwaway URL (`https://www.postb.in/<binId>`), point any API client or webhook sender at that
URL, then read back exactly what was sent. Bins expire ~30 minutes after creation. There is no
account, no API key, and no OAuth flow — every endpoint is unauthenticated by design.

Verified live at time of writing (2026-08-01) via `postb.in/api`, which documents the full REST
surface below. This app's endpoints and response shapes match both that documentation and n8n's
production `PostBin` node source (`n8n-nodes-base`), which targets the same `www.postb.in` host.

## Actions

| Key | Type | Resource | Endpoint |
|---|---|---|---|
| `create-bin` | perform | bin | `POST /api/bin` |
| `get-bin` | read | bin | `GET /api/bin/{binId}` |
| `delete-bin` | perform | bin | `DELETE /api/bin/{binId}` |
| `get-request` | read | request | `GET /api/bin/{binId}/req/{reqId}` |
| `shift-request` | perform | request | `GET /api/bin/{binId}/req/shift` |

### There is no bulk "list requests" endpoint

PostBin's API offers two ways to read what a bin collected, and no third that lists everything at
once: **Get Request** fetches one specific, already-known `reqId` without touching the bin's
queue; **Shift Request** pops and returns the *oldest* uncollected request (FIFO), which is the
walk-the-queue pattern PostBin's own docs recommend when you don't want to track `reqId`s
yourself. A workflow reads everything a bin collected by calling `shift-request` in a loop until
it 404s with "No requests in this bin".

### `shift-request` is `perform`, not `read`

It uses `GET` on the wire (that's PostBin's choice, not this app's), but PostBin's own docs say it
"changes the length of the array" — it removes the element it returns. Typing it `read` would
misrepresent a mutating call as side-effect-free, and retrying a failed invocation could silently
skip ahead in the queue. `idempotent: false` reflects that directly.

### `create-bin` has no params

Creating a bin takes no input — PostBin mints the `binId` and the 30-minute expiry itself. The
action returns `requestUrl` (`https://www.postb.in/<binId>`) as a convenience: that's the exact,
documented URL to point an external API client or webhook at, built from the returned `binId`, not
a separate endpoint.

### `delete-bin` is idempotent

Per PostBin's own docs: deleting a `binId` that doesn't exist (already deleted, or expired) still
answers `200 { "msg": "Bin Deleted" }`. Repeating the call converges on the same end state.

## Auth

None. PostBin has no credential of any kind — no API key, no bearer token, no OAuth. `auth` is
omitted entirely from this app's `index.ts`, per the no-auth-app convention in
`docs/build-a-w6w-app.md`. Every action and health check issues plain, unsigned requests.

## Health check

### Is the vendor up?

PostBin publishes **no separate status page** and **no Atom/RSS status feed** — nothing at
`status.postb.in`, no status link anywhere on the site, no linked source repository to check for a
"service down" notice either. Every documented API endpoint also either needs an existing `binId`
or creates a new bin as a side effect, so there is no side-effect-free *API* probe.

The narrowest honest probe available is the bare homepage: `GET https://www.postb.in/`. It needs
no credential (there is none) and creates nothing, so it is declared as the `service` check
(`kind: "service"`, `scope: "app"`, `credential: "none"`).

### Is this credential live?

Not applicable — there is no credential, no Auth method, and therefore no derived `auth:*` check.

### Do we have quota left?

PostBin's docs document no rate limit, quota, or usage headroom mechanism at all — not even a
numeric threshold without a matching endpoint (contrast Coda, which documents thresholds but no
headroom endpoint). Declared `unavailable` rather than omitted, so a host can tell "we looked and
there is nothing" from "nobody looked".

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 120s | `GET https://www.postb.in/` |
| `quota` | quota | connection | signed (default) | informational | — | _declared absent_ |

**`quota` is declared absent.** PostBin publishes no rate-limit documentation of any kind, so
`severity: "informational"` keeps that permanent `unknown` from ever worsening the App's rolled-up
verdict.

---

Researched and endpoint-verified 2026-08-01 against `postb.in/api` (the vendor's own REST API
docs) and cross-checked against n8n's production PostBin node
(`n8n-nodes-base/nodes/PostBin/`). PostBin's own docs page carries 2015-dated curl examples but
its endpoint shapes, status codes, and error bodies matched what n8n's more recently maintained
node implements against the same host, so the contract in this app is treated as current. The
icon is a pixel-exact vector trace of PostBin's own `favicon.ico`, fetched via a third-party image
proxy (`postb.in` itself refused a direct connection from this environment; the site was
independently confirmed live through other fetch paths — see the app's build notes).
