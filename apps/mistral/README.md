# Mistral AI

Chat completions, embeddings, and OCR via the Mistral AI API.

- **Categories** — ai
- **Auth methods** — api-key
- **Actions** — 4
- **Egress allowlist** — `api.mistral.ai`

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

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
