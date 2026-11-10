# OpenAI

Call OpenAI's REST API — chat completions, images, audio, files, embeddings,
moderations.

- **Categories** — ai, developer-tools
- **Auth methods** — api-key
- **Actions** — 13
- **Triggers** — 2 (poll)
- **Egress allowlist** — `api.openai.com`
- **Website** — https://openai.com
- **API docs** — https://developers.openai.com

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.openai.com>

```
GET https://status.openai.com/api/v2/status.json
```

Atlassian Statuspage. `GET /api/v2/status.json` gives a one-line rollup
(`status.indicator` is `none` / `minor` / `major` / `critical`); `/api/v2/summary.json`
adds per-component detail and open incidents; `/api/v2/components.json` lists the
components on their own. All three are unauthenticated, CORS-enabled and cheap enough to
poll.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The single auth method probes:

```
GET /v1/models
```

Lists models. Free, unlike any completion call, and available to every key.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

`x-ratelimit-limit-requests` / `-remaining-requests` and the matching `-tokens` headers
on every response.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `status.openai.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.

## Triggers

| Key | Mechanism | Wrapped list action | What the run gets |
| --- | --- | --- | --- |
| `new-file` | poll | `files-list` (`GET /v1/files`, `limit=20`, `order=desc`) | Each newly uploaded file. |
| `new-model` | poll | `list-models` (`GET /v1/models`, whole catalog) | Each model newly available to the API key (additions only). |

`new-file` relies on the documented `order` parameter ("Sort order by the `created_at` timestamp", default `desc`) and, to keep the request small, the documented `limit` (1-10000, default 10000); `files-list` gained optional, default-preserving `limit` and `order` inputs for it. `new-model` snapshots the full model list (one unpaginated request, a catalog of a few hundred models) and emits added ids only; renames, removals and edits are ignored. OpenAI publishes no webhook for file or model changes in the pages this app wraps.

Vendor documentation (verified 2026-11-09):

- https://platform.openai.com/docs/api-reference/files/list (also in the OpenAPI spec: https://raw.githubusercontent.com/openai/openai-openapi/manual_spec/openapi.yaml, operation `listFiles`)
- https://platform.openai.com/docs/api-reference/models/list
