# Anthropic

Call Anthropic's REST API — Claude messages, token counting, batches, files.

- **Categories** — ai
- **Auth methods** — api-key
- **Actions** — 14
- **Egress allowlist** — `api.anthropic.com`

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

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
