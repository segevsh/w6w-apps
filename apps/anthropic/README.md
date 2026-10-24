# Anthropic

Call Anthropic's REST API — Claude messages, token counting, batches, files.

- **Categories** — ai
- **Auth methods** — api-key
- **Actions** — 14
- **Egress allowlist** — `api.anthropic.com`
- **Website** — https://www.anthropic.com
- **API docs** — https://docs.anthropic.com

## Pickers

One param asks Anthropic for its choices while the form is open, on the connection the
step already uses:

| Param | Actions | Loaded from |
|---|---|---|
| `model` | `message-create`, `count-tokens` | `GET /v1/models` |

The `resolveFields` hook pages `/v1/models` (`limit=1000`, then `after_id` until `has_more`
is false) up to 1 000 models and sorts them newest first by `created_at`; the option's
label is the model's `display_name` with the id as fallback, and its `created_at` is the
description. Models are the list worth asking for: one released after this App was
published shows up without a new App release.

Both params also set `config: { allowCustom: true }`, so the field is a combobox — a model
id the list does not show can still be typed. Message Create's hint says it plainly:
`Pick a model or type any model id.` The hook runs with `ctx.connection` redacted, its
requests are signed behind the same `network.allow` as any action, and it is capped at
10 seconds.

**When nothing can be loaded.** With no connection picked yet the editor does not call the
hook at all: the field falls back to a plain text input carrying the hint
`Connect an account to load choices`, and the id is still typeable — nothing is cleared. A
hook that throws or runs past its 10 s cap is reported on the fields that call asked for,
with a **Retry**, not on the whole form.

Nothing re-resolves at run time: whatever id sits in the field is what the action sends.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.anthropic.com>

```
GET https://status.anthropic.com/api/v2/status.json
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

Lists models. The only genuinely free probe on this API — a Messages call would spend
tokens, and `/v1/messages/count_tokens` still needs a well-formed request.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

`anthropic-ratelimit-requests-remaining` and `anthropic-ratelimit-tokens-remaining`
response headers, with matching `-limit` and `-reset` headers, on every call.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `status.anthropic.com` (for `service`) is reachable **only inside that hook's worker** — not from any action, and not from the other
checks. The spec allows the widening precisely because the check is unsigned; pairing an
extra host with `credential: "signed"` is rejected at load time, so a credential can never
reach a status host.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
