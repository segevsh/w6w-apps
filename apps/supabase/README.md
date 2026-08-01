# Supabase

**This app is Supabase, not raw/generic Postgres.** w6w Apps run in a network-less sandbox that
can only reach the network via `ctx.fetch` over HTTP(S) to hosts declared in a static
`network.allow` list — there is no raw TCP socket access, so the Postgres wire protocol (what a
generic "Postgres" app would need to speak) genuinely cannot be supported here, and neither can an
arbitrary self-hosted PostgREST endpoint (its domain is unknown at publish time, so it can't go in
a static allowlist). Supabase is a hosted Postgres platform that fronts every project's database
with a real, well-documented HTTP REST API (PostgREST, mounted at `/rest/v1`) on a fixed domain
suffix (`*.supabase.co`) — that fits this sandbox exactly, and it's a widely-used real product for
precisely the "automate my Postgres data over HTTP" use case this app targets. If you need generic
Postgres or a self-hosted PostgREST install, this is not that app.

- **Category** — databases
- **Auth method** — api-key
- **Actions** — 7
- **Egress allowlist** — `*.supabase.co`

## Setup

Every Supabase project has its own host, `https://<project-ref>.supabase.co`. From your project's
dashboard: **Settings → API** gives you the **Project URL** and the **Project API keys** this app
needs.

## Auth — Project URL & API Key

Supabase's data REST API sits behind a gateway that requires the key on **two** headers at once —
confirmed against Supabase's own docs and a first-hand integrator report of the failure mode
([supabase-community/postgrest-go#29](https://github.com/supabase-community/postgrest-go/issues/29)):

```
GET https://<project-ref>.supabase.co/rest/v1/<table>
apikey: <key>
Authorization: Bearer <key>
```

- `apikey` — read by the gateway in front of Postgres. Omit it and every call fails with 401
  `"No API key found in request"`, before PostgREST even sees the request.
- `Authorization: Bearer <key>` — read by PostgREST itself, to resolve which Postgres role the
  request runs as.

Both headers carry the **same** key string, so this app collects only one `apiKey` field and
`sign` stamps it onto both headers.

### anon vs. service_role — which key to use

| Key | Postgres role | Row Level Security | Use for |
|---|---|---|---|
| **anon** | `anon` (or `authenticated`) | **Enforced** — bound by whatever RLS policies the project defines | The default. Safe-by-design: even a workflow bug or bad policy has a bounded blast radius. |
| **service_role** | role with `BYPASSRLS` | **Bypassed entirely** — full read/write on every table | Only when a connection genuinely needs to see or write data RLS would otherwise hide, e.g. an admin/back-office workflow. |

Supabase's own docs call exposing `service_role` "extremely dangerous." Never use it for a
connection whose params can be influenced by untrusted input (a public form, an inbound webhook
body) — with RLS bypassed, a crafted `filters` value can read or delete rows outside what the
workflow's author intended.

## Actions

All actions are table/function-agnostic (Supabase's schema isn't known when this app is
published), so every action takes a `table` — or, for the RPC action, `function` — param plus
PostgREST's own query syntax. `filters` is a raw PostgREST filter query-string fragment, e.g.
`id=eq.5` or `age=lt.13&student=is.true`; see [PostgREST's own filtering
docs](https://postgrest.org/en/stable/references/api/tables_views.html#horizontal-filtering-rows).

| Key | Type | What it does |
|---|---|---|
| `rows-list` | search | `GET` a table/view with `select=`/`order=`/`limit=`/`offset=` and a raw filter fragment. |
| `row-get` | read | `GET` exactly one row via `Accept: application/vnd.pgrst.object+json` — fails with a clear error if the filter matches zero or more than one row. |
| `rows-count` | read | `HEAD` + `Prefer: count=exact`, reading the total off the `Content-Range` response header without transferring rows. |
| `rows-insert` | perform | `POST` one row (object) or many (array). `upsert` + `onConflict` add `Prefer: resolution=merge-duplicates` and `on_conflict=`. |
| `rows-update` | perform | `PATCH` matching rows with a JSON object of columns to set. `filters` is **required** — an update with no filter would rewrite the whole table. |
| `rows-delete` | perform | `DELETE` matching rows. `filters` is **required** for the same reason. |
| `rpc-call` | perform | `POST /rpc/<function>` — call a Postgres function exposed via PostgREST, with a JSON object of its named arguments. |

All write actions ask for `Prefer: return=representation`, so the response carries the affected
rows rather than requiring a follow-up read.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and is *this project* reachable.

### Is the vendor up?

**Service status** — <https://status.supabase.com>, Statuspage.io-powered. Its footer links an
Atom feed (`history.atom`), which the `service` health check declares and the host fetches/parses.
Each incident keeps one entry whose leading status word (`Investigating` / `Identified` /
`Monitoring` / `Update` / `Resolved`) is read to decide whether it's still open — not the newest
headline, which stays the same across every update to a long-running incident.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the
three it performs itself. It probes:

```
GET /rest/v1/
apikey: <key>
Authorization: Bearer <key>
```

The PostgREST root: cheap, table-agnostic, and rejected by the gateway before any table is
touched if the key is bad.

### Is this project reachable?

`reachable` probes `GET /rest/v1/` on this connection's own project host, **without** the
`apikey` header. A `401` ("No API key found in request") is a *pass* — it proves the project's
host resolves, TLS terminates, and the gateway is serving. A `404` means the project was likely
paused or deleted; a `5xx` or transport failure means it's down. This is deliberately a different
question from credential liveness: "the project was paused" and "your key is wrong" are different
problems that deserve different messages.

### Is there quota left?

**Not implemented — no verifiable signal exists.** Supabase's Management API (organization/project
administration, requiring a personal access token) documents `X-RateLimit-*` response headers, but
that is a different surface from the project data API (`/rest/v1`) this app calls, and no
rate-limit/quota header is documented for the data API itself. Rather than guess at a header that
may not exist, this app declares no `quota` check.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 120s | `health/service.ts` (feed-backed) |
| `reachable` | dependency | connection | context | degraded | 120s | `health/reachable.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

No `quota` check is declared — see "Is there quota left?" above.

---

Researched and endpoint-verified 2026-07-31 against Supabase's and PostgREST's own documentation
(`supabase.com/docs`, `postgrest.org/en/stable`). Icon sourced from n8n's own (MIT-licensed)
`nodes-base` package (`packages/nodes-base/nodes/Supabase/supabase.svg`), matching Supabase's
documented brand green `#3ECF8E` and bolt logomark.
