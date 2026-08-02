# APITemplate.io

Generate PDFs and images from APITemplate.io templates.

- **Categories** — developer-tools
- **Auth methods** — api-key
- **Actions** — 5
- **Egress allowlist** — `rest.apitemplate.io`
- **Website** — https://apitemplate.io
- **API docs** — https://apitemplate.io/apiv2/

## API surface

APITemplate.io publishes two API generations. Its own docs mark v1
(`api.apitemplate.io/v1`) "no longer supported" and point at v2. This app targets
**v2**, whose base URL and auth header are confirmed by the official Python SDK's
generated `Configuration` default and every first-party client library:

```
Base URL:  https://rest.apitemplate.io
Auth:      X-API-KEY: <key>   (no prefix)
```

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *generation
credit* left.

### Is the vendor up?

**Declared `unavailable`.** `status.apitemplate.io` is an UptimeRobot-hosted public
status page. Unlike Statuspage.io/Instatus, UptimeRobot's public pages expose no
RSS/Atom feed or JSON API — no `<link rel="alternate">` feed tag in the page head,
and the conventional `/feed` and `/history.rss` paths both 404. There is nothing
machine-readable to declare a `feed` against, so `health/service.ts` says so
honestly instead of faking a check or leaving a silent gap.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only
one of the three it performs itself.

```
GET /v2/list-templates?limit=1
```

Cheap, needs no scope beyond reading templates, and never spends a generation
credit.

### Do we have generation credit left?

**Declared `unavailable`.** APITemplate.io bills per-generation against an account
credit balance, but neither the v2 REST API nor its official SDKs document an
account/credits/usage endpoint, and none of this app's actions' documented
response fields or headers carry a remaining-credit count or a rate-limit header.
The only usage signal documented anywhere is a bare HTTP 429 once a plan's
concurrency limit is hit — a fact, not a number, and not something a
side-effect-free probe can observe without spending a generation to find it.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | informational | `unavailable` — no machine-readable status surface |
| `quota` | quota | connection | signed | informational | `unavailable` — no credits/usage endpoint or headers documented |
| `auth:api-key` | credential | connection | signed | fatal | derived from the `api-key` auth method's `test` hook |

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `create-image` | perform | `POST /v2/create-image` |
| `create-pdf` | perform | `POST /v2/create-pdf` |
| `list-templates` | read | `GET /v2/list-templates` |
| `get-template` | read | `GET /v2/get-template` |
| `list-objects` | read | `GET /v2/list-objects` |

`get-template`'s own vendor SDK docs mark it "an experimental API, contact support
to learn more" — it is real and documented (not invented), but the vendor does not
commit to it the way it does the others.

### Deliberately not built

- **Get account info.** The n8n community node's `GenericFunctions.ts` calls an
  undocumented `/account-information` endpoint on the deprecated **v1** host
  (`api.apitemplate.io/v1`). No equivalent exists in the v2 API or its official
  SDKs (checked against the Python SDK's generated per-endpoint docs, which
  enumerate every response schema) — nothing to ground an action in on the
  current API, so it was left out rather than invented or ported from the
  deprecated generation.
- **create-pdf-from-html / create-pdf-from-url / merge-pdfs / update-template /
  delete-object.** Real v2 endpoints, but out of scope for this pass to keep the
  action set to the vendor's core "fill a template, get a file" workflow plus
  enough read actions to look up templates and prior output. `update-template` is
  also marked experimental/support-gated in the vendor's own docs.

---

Researched and endpoint-verified 2026-08-01 against the official Python SDK
(`APITemplate-io/apitemplateio-python`, generated `Configuration` + per-endpoint
docs) and `docs.apitemplate.io`'s own v1-deprecation notice. Status/quota
surfaces move; re-verify before wiring either health check if a machine-readable
option shows up later.
