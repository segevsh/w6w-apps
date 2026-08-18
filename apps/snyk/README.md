# Snyk

Read Snyk issues, projects, targets and SBOMs, and audit an organization's
security posture.

- **Categories** — security, developer-tools
- **Auth methods** — api-token
- **Actions** — 20
- **Egress allowlist** — `api.snyk.io`
- **Website** — https://snyk.io
- **API docs** — https://docs.snyk.io/snyk-api ·
  schema: `https://api.snyk.io/rest/openapi/{version}` (served by Snyk's own API)

## Setup

### API Token

1. In Snyk, go to **Account Settings → General → Auth Token**, or create a
   **service account** token for automation.
2. Paste it into the connection's **API Token** field. It is sent as
   `Authorization: Token <key>` — **not** `Bearer`. Snyk's own scheme
   description states the value "must be prefixed with `Token `".
3. **Organization ID** is optional but recommended: most of the API is
   org-scoped and the id is a UUID, so setting it once saves passing it on
   every action. Find it under Snyk → Settings → General.
4. **API Version** defaults to the date this app was built against. Change it
   only deliberately — see below.

## Actions

| Key | Type | Description |
|---|---|---|
| `issue-list` | read | List an org's issues by severity, status, type or date |
| `issue-get` | read | Get one issue in full |
| `issue-list-group` | read | List issues across every org in a group |
| `project-list` | read | List scanned projects |
| `project-get` | read | Get one project |
| `project-update` | perform | Set tags, environment, lifecycle, criticality |
| `project-delete` | perform | Remove a project and its history |
| `project-sbom-get` | read | Generate a project's SBOM |
| `target-list` | read | List the repositories projects came from |
| `target-get` | read | Get one target |
| `target-delete` | perform | Remove a target and all its projects |
| `org-list` | read | List organizations |
| `org-get` | read | Get one organization |
| `group-list` | read | List groups |
| `self-get` | read | Get the account this connection authenticates as |
| `package-issues-get` | read | Known issues for one package version, by purl |
| `package-issues-list` | read | Known issues for many packages at once |
| `audit-log-list` | read | Search the org's audit log |
| `collection-list` | read | List project collections |
| `collection-project-list` | read | List the projects in a collection |

### Every request names a version, and this app pins one

Snyk's API is **date-versioned**, and `version` is a *required query parameter*
on **253 of the document's 290 operations**. `GET /openapi` listed **323**
versions when this app was written.

That is deliberate on Snyk's part: you pin a date and migrate when you choose.
So this app pins one in `lib/client.ts`, stamps it on every request from that
single place, and lets a Connection override it. It does **not** track "latest"
— that would change response shapes underneath a running workflow. A test
asserts the pinned value is a plain date, and another asserts no action sets
`version` itself.

Every response shape declared in these actions was read from the pinned
version's document. If you move a Connection to a different date, expect to
check them.

### JSON:API, not plain JSON

Reads answer `{data, jsonapi, links}` with the real content under
`data[].attributes`. Writes take `{data: {id, type, attributes}}` — the resource
identity travels in the body alongside the attributes, and Snyk rejects a bare
attribute object. Both directions use the media type `application/vnd.api+json`,
which Snyk enforces on writes.

Pagination follows `links.next`, whose cursor parameter is `starting_after`. The
schema declares `next` as `oneOf` a bare URL string or an object with an `href`,
and the value may be **relative** — so the client handles both shapes and
extracts the cursor rather than following the URL, which keeps the request on
the known base with the credential intact.

### Project, target, org, group

Four nouns that are easy to conflate:

- A **target** is a repository or artifact source.
- A **project** is one scanned manifest inside it — a repo with three lockfiles
  is three projects under one target. `project-list` and `target-list` are
  different questions.
- An **org** owns targets. A **group** owns orgs, which is why
  `issue-list-group` exists alongside `issue-list`: only the group endpoint
  answers "every critical issue in the company".

### Effective severity, not severity

`issue-list` filters on `effective_severity_level`. Snyk distinguishes an
issue's inherent severity from the one that applies *after* the organization's
policies and ignores are taken into account, and the effective one is what a
triage workflow should act on.

### purls are percent-encoded

`package-issues-get` identifies a package by **purl** (`pkg:npm/lodash@4.17.20`),
which contains `/`, `@` and sometimes `%`. Unencoded it would address a
different endpoint, so it is encoded into the path — and a value that does not
start with `pkg:` is refused locally, where the message can say why, rather than
as a 404.

`package-issues-list` is the bulk form: a POST, because a whole dependency list
is far too long for a query string.

### SBOM format is required

`project-sbom-get` has no default. CycloneDX and SPDX are different documents
and Snyk will not choose for you, so a blank format fails locally.

### List actions declare no `output` fields

Eleven list actions unwrap the JSON:API `data` envelope and return the bare
array, so there are no top-level fields for an `output` declaration to name.
`project-sbom-get` is in that list for a different reason: the document it
returns is whichever SBOM standard you asked for. The auditor's warnings are the
accurate signal.

### Deliberately out of scope

- **Service accounts, app secrets and personal access tokens**
  (`/orgs/{id}/service_accounts`, `.../secrets`, `/self/personal_access_tokens`).
  These mint and rotate live credentials, which an action would write into step
  output and run logs — the same reasoning the `resend` and `algolia` apps
  apply.
- **Broker deployments and connections** (`/tenants/{id}/brokers/*`) —
  on-premise connector plumbing, a large surface with its own vocabulary.
- **Asset inventory and Snyk Learn** (`/…/inventory/assets`, `/learn/*`) — each
  a coherent product surface deserving its own action set.
- **Async export and test jobs** (`/…/export`, `/…/tests`, `/…/sbom_tests`) —
  each a create-poll-fetch trio returning large files.

## Health check

Four questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *the pinned API version still served*, is *this
credential* live, and do we have *quota* left.

### Is the vendor up?

**Atlassian Statuspage**, verified 2026-08-18:

```
GET https://status.snyk.io/api/v2/summary.json -> 200, 39,448 bytes
    {"page":{"id":"myj6w6kw42c6","name":"Snyk",…},
     "components":[{"name":"SNYK-US-01 (app.snyk.io)",…}, …]}
GET https://status.snyk.io/api/v2/status.json  -> 200, 207 bytes
```

Two real endpoints returning distinct documents. `summary.json` is what the
check reads: its components are Snyk's **regional deployments**
(`SNYK-US-01`, `SNYK-EU-01`, …), which is what tells an operator whether an
incident is in their region.

### Is the pinned API version still served?

**This check is specific to Snyk, and it exists because nothing else would
catch it.** A pinned version going stale is a scheduled outage that stays
invisible until calls start failing.

Snyk publishes exactly the headers needed to see it coming — its document
declares `snyk-version-requested`, `snyk-version-served`,
`snyk-version-lifecycle-stage`, `deprecation` and `sunset`. The check reads them
off `GET /self` and reports two conditions:

- **Served ≠ requested.** Snyk resolves an unknown or retired date to the
  nearest supported one and says so. Calls keep working, and the response shapes
  may no longer be the ones this app was built against.
- **Deprecated or sunset.** The lifecycle stage names the stage, and `sunset`
  carries the date after which the version stops being served.

It reports `degraded`, not `down`: a deprecation is a deadline, not an outage.

### Is this credential live?

`GET /self` — Snyk's whoami. It takes no org, group or tenant id, so it proves
the token without assuming the connection's `orgId` is correct. A `400` is
reported as a probably-invalid version date, which is a different fix from a
`401`.

### Do we have quota left?

**Declared unavailable.** Snyk's document is unusually thorough about response
headers — it declares nine (`snyk-request-id`, the three `snyk-version-*`,
`deprecation`, `sunset`, `retry-after`, `content-location`, `location`) — and
**none of them reports rate-limit headroom**. `ratelimit` and `x-ratelimit`
appear nowhere in its 192 paths, only 2 of 290 operations declare a `429`, and a
live unauthenticated call returns none.

The `retry-after` Snyk does publish is a backoff instruction sent *after* you
have been limited: it answers "how long to wait", not "how much is left", so
there is nothing a periodic probe could report.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `GET status.snyk.io/api/v2/summary.json` |
| `api-version` | dependency | connection | signed | degraded | 3600s | `GET /self`, reading the `snyk-version-*` headers |
| `quota` | quota | — | — | informational | — | declared `unavailable` — no headroom header exists |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` method's `test` hook |

## Icon

`assets/icon.svg` — the Snyk mark, from
<https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/snyk.svg>, downloaded
2026-08-18.

- **2,976 bytes**, md5 `f63a6cebf166b178edf1db159eeb16d8`,
  `<title>Snyk</title>`, `viewBox="0 0 24 24"`
- inked with `#4C4A73`, the hex simple-icons records for this brand (sourced
  from Snyk's own press kit)
- **no dark variant needed**: `_tools/icon-legibility.ts` reports the mark
  already legible on both tiles
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the
  path data inside the nested `<svg>` is the vendor's, verbatim

---

Researched and endpoint-verified 2026-08-18 against the OpenAPI document Snyk
serves from its own API host (`https://api.snyk.io/rest/openapi/2026-03-25`,
192 paths), plus live probes of `api.snyk.io` and `status.snyk.io`. Status
surfaces move, and so do API versions — if `api-version` starts reporting a
sunset, that is this app's cue to move `DEFAULT_VERSION` and re-check the
response shapes.
