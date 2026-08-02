# DeepL

Translate text and documents, manage glossaries, and check quota via the DeepL API.

- **Categories** — ai
- **Auth methods** — api-key
- **Actions** — 8
- **Egress allowlist** — `api-free.deepl.com`, `api.deepl.com`
- **Website** — https://www.deepl.com
- **API docs** — https://developers.deepl.com/docs

## Free vs Pro: two hosts, one App

DeepL splits its API across two hosts by account tier:

| Tier | Host |
|---|---|
| Free | `api-free.deepl.com` |
| Pro | `api.deepl.com` |

The tier is encoded in the API key itself — every Free-tier key ends in the literal suffix
`:fx` (e.g. `279a2e9d-83b3-c416-7e2d-f721593e42a0:fx`); Pro keys never carry it. This is
documented DeepL behavior (developers.deepl.com's auth guide), not a guess, confirmed against
DeepL's own docs on 2026-08-01.

**The problem this creates:** an Action never sees the raw credential — only the Auth method's
`sign` and `test` hooks do (see `build-a-w6w-app.md` invariant 5). But which *host* to call has
to be decided before a request is built, i.e. by the action/client layer. So how does code that
never sees the key know which of the two hosts to call?

**The answer here:** the `api-key` auth method's `afterConnect` hook — which *does* see the
credential once, at connect time — derives a non-secret label, `plan: "free" | "pro"`, from the
`:fx` suffix and stores it in the Connection's `display` metadata. `display` is part of the
*redacted* Connection (`ctx.connection.display`) every hook receives — never the credential
itself. `lib/client.ts#hostForConnection` reads that label to pick the base URL, and every
action goes through `DeepLClient`, which resolves its host once per instantiation from
`ctx.connection?.display`.

`sign` (in `auth/api-key.ts`) stays deliberately simple: it stamps the `Authorization` header
and never touches `request.url`. `sign` *could* have inspected the raw key's `:fx` suffix and
rewritten the URL instead — `SignableRequest.url` is mutable, so that path would work too — but
that would make the one network-less, credential-isolated hook responsible for a piece of
routing logic every other hook already has a credential-free way to reach (the `afterConnect`
label). Keeping host selection in the client/action layer keeps `sign` doing exactly one thing:
inject the credential.

`auth.test` runs *before* `afterConnect` exists (lifecycle: `preflight → exchange → test →
afterConnect → sign`), so it can't rely on the label yet — it derives the host from the raw key
directly instead, the same suffix check `afterConnect` performs a moment later
(`lib/client.ts#hostForKey`).

If a Connection is used before `display.plan` is ever populated (shouldn't happen in normal
operation, since `afterConnect` runs as part of connecting), `hostForConnection` defaults to the
Pro host — a safe default either way, since a mismatched host just fails the call with an auth
error rather than silently misrouting a working credential.

## Auth

**`api-key`** (`type: "apiKey"`) — a single secret field, `apiKey`. Every request signs with:

```
Authorization: DeepL-Auth-Key <key>
```

Note the `DeepL-Auth-Key` scheme — **not** the standard `Bearer` prefix. This is DeepL's own
documented auth header (developers.deepl.com/docs/getting-started/auth).

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `translate-text` | perform | `POST /v2/translate` |
| `translate-document` | perform | `POST /v2/document` (submit only — see below) |
| `document-status` | read | `POST /v2/document/{id}` |
| `document-download` | read | `POST /v2/document/{id}/result` |
| `get-usage` | read | `GET /v2/usage` |
| `list-languages` | read | `GET /v3/languages?resource=translate_text` |
| `glossary-list` | read | `GET /v2/glossaries` |
| `glossary-get` | read | `GET /v2/glossaries/{id}` |

### Document translation is three actions, not one

DeepL translates documents asynchronously — large files can take minutes. Rather than block a
single `execute` call with an internal poll loop (which risks the hook's own timeout on a slow
job), document translation is modeled as three independent actions that a workflow chains
together with its own delay/loop step:

1. `translate-document` — upload, get back `documentId` + `documentKey`.
2. `document-status` — poll until `status` is `"done"` (or `"error"`).
3. `document-download` — fetch the translated file once done.

`document-download`'s response is raw `application/octet-stream` bytes with no JSON envelope, so
the action base64-encodes it into `fileBase64` (the same convention this pack's `box` and
`dropbox` download actions use) — binary content otherwise can't survive JSON serialization
across the sandbox boundary. `translate-document`'s `file` param takes the inverse: a
`data:<mime>;base64,...` URL (or bare base64 + a `mimeType` param), matching this pack's
`twitter` app's upload convention.

### Languages

`list-languages` uses `GET /v3/languages?resource=translate_text`, which DeepL's own docs
recommend over the deprecated `GET /v2/languages` (a separate call per `type=source|target`) —
v3 returns every language once, each flagged with `usableAsSource` / `usableAsTarget`, so this
app needs one action instead of two.

### Not implemented

`GET /v2/glossaries/{id}/entries` (the term list inside a glossary) and glossary creation are
real DeepL endpoints this app does not expose, to keep the action set to what the task's "4-8,
narrow API" guidance called for. `glossary-list` / `glossary-get` cover the metadata half DeepL's
own docs describe as the common integration case.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — DeepL's own status page, `https://api-status.deepl.com/` (linked from
DeepL's Help Center article "DeepL status page"), publishes status two ways:

- An RSS feed at `/rss`.
- The JSON document its own single-page app fetches from `/api/status` to render the page.

This check uses the **JSON endpoint**, not the `feed:` (RSS) mechanism this pack's `mistral` app
uses, for a reason specific to DeepL: DeepL's RSS entries carry only free-text incident prose
with **no resolved/open marker** — every `<guid>` in that feed is unique (one item per incident,
not one per update the way Mistral's feed works, where updates to the same incident share a
`guid` and the host's `latest` fold collapses them). There is no structural way to tell a
resolved incident from an open one in that feed without guessing at phrases like "has been
resolved" buried in the description body — exactly the kind of prose-guessing
`rfcs/healthcheck.md` says to avoid when a real field exists.

A real field *does* exist, just not in the RSS: `/api/status` returns an explicit `status` field
per incident (`"resolved"`, ...) and an explicit `status` per datacenter (`"operational"`, ...).
This check reads those structured fields instead of inferring anything from text.

**The tradeoff, stated plainly:** `/api/status` is not a documented, versioned API contract the
way `/v2/usage` is — it's the endpoint DeepL's own status frontend happens to call today,
confirmed live and reachable unauthenticated on DeepL's own status host as of 2026-08-01. If it
ever changes shape, the check's guards (non-2xx, non-JSON, missing `overall` field, unrecognized
status tokens) all resolve to `state: "unknown"` rather than crashing or assuming the platform is
up.

`api-status.deepl.com` is declared only in this check's own `network.allow` — reachable from this
hook alone, never from an Action, and never signed (`credential: "none"`, enforced host-side).

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the
three it performs itself. It calls `GET /v2/usage` against the correct host for the key's tier
(free vs pro, detected from the `:fx` suffix). Free, unlike a translate call.

### Do we have quota left?

`GET /v2/usage` — the same call `test` and the `get-usage` action use. Unlike most vendors (whose
quota lives in undocumented response headers), DeepL's usage endpoint is a genuine documented
quota surface: `character_count` / `character_limit`, plus `document_count` / `document_limit`
for accounts with a document cap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 300s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

The host `api-status.deepl.com` (for `service`) is reachable **only inside that hook's worker** —
not from any action, and not from the other checks. The spec allows the widening precisely
because the check is unsigned; pairing an extra host with `credential: "signed"` is rejected at
load time, so a credential can never reach a status host.

---

Researched and endpoint-verified 2026-08-01 against developers.deepl.com and DeepL's status page.
Status surfaces move; re-check with `_tools/audit.ts` conventions in mind if a probe starts
failing for everyone at once.
