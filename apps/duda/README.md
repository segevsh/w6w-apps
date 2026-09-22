# Duda

Manage Duda sites, pages, form submissions, collections (structured data tables) and
accounts through the Partner API.

- **Categories** — cms, forms, marketing
- **Auth methods** — basic
- **Actions** — 14
- **Egress allowlist** — `api.duda.co`, `api.eu.duda.co`
- **Website** — https://www.duda.co
- **API docs** — https://developer.duda.co/reference/getting-started-with-the-duda-api

## Setup

Duda's Partner API is not self-serve — request access through your Duda dashboard or
[support](https://support.duda.co/hc/en-us/requests/new). Once granted, get the **API user
and password** from the Business tools tab's "Service API Account" (or from your Duda
contact) and connect this app with:

- **Region** — `US` (default, `api.duda.co`) or `EU` (`api.eu.duda.co`). A Duda account is
  provisioned in exactly one region; a credential from one is rejected by the other.
- **API User** / **API Password** — sent as HTTP Basic.

## Actions

**Sites** — `list-sites`, `get-site`, `create-site` (from a template), `publish-site`,
`unpublish-site`.

**Pages** — `list-pages` (Pages v2).

**Form submissions** — `get-form-submissions`.

**Collections** — `list-collections`, `get-collection`, `create-collection-rows`,
`update-collection-rows` (whole-row overwrite — see below), `delete-collection-rows`.

**Accounts** — `get-account`, `create-account`.

## Notes on the API

A few things worth knowing, found while verifying this app against Duda's live API on
2026-09-22 rather than only its docs:

- **Duda is region-sharded into exactly two hosts.** Every documented endpoint's OpenAPI
  fragment declares both `https://api.duda.co` ("Production (US)") and
  `https://api.eu.duda.co` ("Production (EU)"), and both answered live when probed. That's a
  bounded set, unlike a per-tenant host — so both hostnames are in `network.allow` and the
  Connection carries a `region` field rather than the app needing a wildcard allowlist.
- **A rejected credential gets no body at all.** The docs show a `401` as a JSON `ErrorRDT`
  object (`{ "error_code": "UnAuthorized", ... }`). Measured live — no `Authorization` header,
  and again with a syntactically valid but wrong `Basic` credential, against three different
  paths and both regional hosts — every `401` actually answers with `content-length: 0`, only
  a `WWW-Authenticate: Basic realm="DM API"` header. The auth `test` hook can't read a vendor
  error code that was never sent, so it classifies success by the **documented response
  shape** (the paginated site-list envelope) instead of trusting `res.ok` alone, and failure
  by the (bodiless) status — never by echoing the credential back.
- **The Collections endpoints are documented in a separate, older OpenAPI dialect.** The main
  Partner API document (3.0.1) publishes `/api/...` paths against the two servers above; the
  Collections pages (3.1.0) publish `/sites/multiscreen/...` paths against a single
  `https://api.duda.co/api` server and return bare arrays rather than the paginated envelope
  the rest of the API uses. Both are the same live API on the wire — this app appends the same
  `/api` prefix and the same region-selected host to both.
- **Updating a collection row is a full overwrite, not a patch.** Duda's Collections guide is
  explicit that an update call takes the row id plus *all* fields — any field left out of
  `data` is blanked, not left alone. `update-collection-rows`'s param hint says so; read the
  row with `get-collection` first if you're changing one value.
- **No machine-readable rate-limit signal exists anywhere.** Duda documents only a flat
  10 req/s global ceiling plus a handful of per-endpoint per-minute ceilings (20/min for
  publish/unpublish, 60/min for create-site/create-account, 300/min for form submissions), all
  enforced with a bare `429`. No response carries an `x-ratelimit-*` header and there's no
  quota endpoint — confirmed on both regional hosts. The `quota` health check is declared
  `unavailable` (`informational`) rather than omitted, and a `429` is turned into a message
  naming the documented ceilings by `lib/client.ts`.

## Health check

### Is the vendor up?

**Service status** — <https://status.duda.co> (real Statuspage instance, page id
`j091xm0zc1x9`). Five flat components: `Live Sites`, `Editor`, `API`, `Sandbox`, `eCommerce`.
Only **`API`** is what this app's calls depend on — the other four are Duda's own UI/hosting
surfaces, and rolling them together would report an outage that isn't one for anything this
app does.

### Is this credential live?

The `basic` auth method's `test` hook — see "Notes on the API" above for why it classifies by
response shape rather than by a vendor error code.

### Do we have quota left?

Nothing to read — see "Notes on the API" above.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | (default) | 120s | `health/service.ts` — `status.duda.co`'s `API` component |
| `quota` | quota | connection | none | informational | — | _declared unavailable_ |
| `auth:basic` | credential | connection | signed | fatal | — | derived from the `basic` auth method's `test` hook |

---

Researched and endpoint-verified live 2026-09-22 against `developer.duda.co`'s machine-readable
markdown mirrors (each reference page's embedded OpenAPI fragment) and `curl` probes of both
regional hosts and the status page.
