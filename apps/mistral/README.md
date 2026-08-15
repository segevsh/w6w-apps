# Mistral AI

Chat completions, embeddings, and OCR via the Mistral AI API.

- **Categories** — ai
- **Auth methods** — api-key
- **Actions** — 4
- **Egress allowlist** — `api.mistral.ai`
- **Website** — https://mistral.ai
- **API docs** — https://docs.mistral.ai/api/

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — feed only.

```
GET https://status.mistral.ai/feed.rss
```

The page itself is Checkly-hosted and exposes no JSON rollup; the RSS feed is the
machine-readable surface.

**The feed is a log of updates, not a statement of current state**, and reading it as the
latter produces confident nonsense. It currently carries 50 entries describing 26
incidents: each update to an incident is its own entry, and the newest entry for a
*resolved* incident still carries the incident's original title — "Audio API Degraded"
stays the title of the update that says it is fixed. Judging by the newest headline
reports an outage that ended days ago.

The `service` check therefore declares the feed (`feed: { url, format: "rss" }`) and reads
`input.feed.latest` — the host's fold to the newest update per `<guid>` — then takes each
incident's state from the `Status:` field the vendor writes at the head of every
update body (`Status: Resolved`, `Status: Investigating`). That field is machine-readable,
so nothing is inferred from prose. Affected components come from the `<li>` list in the
same body, which is what lets an Audio API incident report against `audio-api` rather than
greying out the platform.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The single auth method probes:

```
GET /v1/models
```

Lists models. Free, unlike any completion call.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

`x-ratelimit-limit` / `-remaining` / `-reset` response headers, metered per minute in
both requests and tokens.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 120s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `status.mistral.ai` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.


## Icon

`assets/icon.svg` — the vendor's palette; the previous artwork carried black bars the brand does not use.

Taken from <https://www.mistral.ai/favicon.svg> on 2026-08-15.

- **919 bytes**, `image/svg+xml`, md5 `9f2bf54460fa831851d383f527c13620`
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the artwork
  inside the nested `<svg>` is the vendor's, verbatim

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
