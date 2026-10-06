# Short.io

Create, update, list and delete branded short links on your own Short.io domains, and read the
domains, tags, folders and QR codes around them, over the Short.io REST API (`api.short.io`).

- **Categories** — marketing, developer-tools
- **Auth methods** — `api-key`
- **Actions** — 18
- **Egress allowlist** — `api.short.io`
- **Website** — https://short.io
- **API docs** — https://developers.short.io (OpenAPI 3.1 at https://api.short.io/openapi.json)

Every path, verb, parameter and body field was checked on 2026-10-06 against the vendor's OpenAPI
document (71 paths) and live unauthenticated probes. Nothing came from a third-party directory.

## Auth

**API Key** (`apiKey`) — a **secret** key from Short.io dashboard > Integrations & API, sent as
`Authorization: <key>` with **no `Bearer` prefix** (the spec's only security scheme is
`apiKey` in the `Authorization` header). A public key (`pk_…`) is accepted only by
`POST /links/public`, which this app does not call, so use a secret key.

The credential check (`test`) calls `GET /api/domains?limit=1`. It needs a credential (401 without
one) and returns a JSON array of domain objects, none of which is the caller's key; there is no
whoami endpoint in the spec. It is classified from the body: a JSON array passes, the vendor's
`{"error":"Unauthorized"}` is a rejection, and a 200 that is not a domain list is not a pass.

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `link-create` | perform | `POST /links` |
| `link-get` | read | `GET /links/{linkId}` |
| `link-update` | perform | `POST /links/{linkId}` (the vendor updates with POST) |
| `link-delete` | perform | `DELETE /links/{link_id}` |
| `link-list` | search | `GET /api/links` (cursor-paginated, `limit` max 150) |
| `link-expand` | read | `GET /links/expand?domain=&path=` |
| `link-archive` | perform | `POST /links/archive` |
| `link-unarchive` | perform | `POST /links/unarchive` |
| `link-duplicate` | perform | `POST /links/duplicate/{linkId}` |
| `link-bulk-create` | perform | `POST /links/bulk` (up to 1,000 per call) |
| `link-bulk-delete` | perform | `DELETE /links/delete_bulk` |
| `domain-list` | search | `GET /api/domains` |
| `domain-get` | read | `GET /domains/{domainId}` |
| `tag-list` | search | `GET /tags/{domainId}` |
| `qr-code-create` | perform | `POST /links/qr/{linkIdString}` (`accept: application/json`) |
| `folder-list` | search | `GET /links/folders/{domainId}` |
| `folder-get` | read | `GET /links/folders/{domainId}/{folderId}` |
| `folder-create` | perform | `POST /links/folders` |

Things worth knowing:

- **Two id kinds.** Links are addressed by the encoded `idString` (`lnk_…_…`), which is what
  Create/Get/List return. Domains are addressed by a numeric `id` in `link-list`, `tag-list`,
  `domain-get` and the folder actions, but by **hostname** in `link-create`, `link-expand` and
  `link-bulk-create`. `domain-list` returns both.
- **Inconsistent routes.** Listing links is `/api/links`, listing domains is `/api/domains`;
  everything else lives under `/links/…` or `/domains/…`.
- **Create is not idempotent.** With no `path`, re-posting an existing destination returns the
  existing link; with a custom `path` it mints a second link; a taken `path` with a different
  destination is a 409.
- **Bulk create can partially fail on a 200.** Failed elements come back as error objects in the
  result array; `failed` counts the elements with no `idString`.
- **The echoed `password` is removed.** A link created with a password is returned with it in
  plain text by the vendor; every link-returning action deletes it before returning.
- **Undocumented responses are passed through.** The OpenAPI document declares no response schema
  for the folder routes or the QR route (`Default Response` only), so `folder-*` and
  `qr-code-create` return the body untouched under `result` and claim no fields. QR is requested with
  `accept: application/json`, which the operation describes as returning a hosted URL; without it
  the vendor returns image bytes a workflow cannot carry.
- **Delete/archive failures.** These routes carry `{success, error}`; a 200 with `success: false`
  is raised as an error.

## Health checks

- **`service`** — `https://shortiostatus.com/index.json`, Short.io's own status page. It is a
  **cState** site (Hugo, `cStateVersion` 6.0.1, served from GitHub Pages), neither Statuspage nor
  Better Stack: `/api/v2/summary.json`, `/history.atom` and `/feed.rss` all 404. Its `systems`
  array has an **`API`** component (alongside Redirects, Dashboard, Landing page and Statistics
  EU/US); the verdict follows that component, not `summaryStatus`, and the others are reported as
  components. cState statuses are `ok`/`notice`/`disrupted`/`down` (only `ok` was observed live).
  Unauthenticated; the status host is granted to the hook only, not to `network.allow`.
- **`quota`** — declared unavailable (`informational`): Short.io documents rate limits only as prose
  per operation and sends no rate-limit headers.
- Credential liveness is the derived `auth` check from `test` above.

## Icon

`assets/icon.svg` is Short.io's own favicon, `https://short.io/favicon.svg` (749 bytes, viewBox
128), copied verbatim (md5 `8c13f40658976ea1dfb8ba37a8be0e8d`).

## Not yet covered

- **Link statistics.** Clicks and referrer statistics are served from a separate host
  (`statistics.short.io`) and are not in the OpenAPI document, so their paths and shapes could not
  be verified; left out rather than guessed.
- Link-adjacent: opengraph, link countries/regions (geo targeting), link permissions, hosted QR
  list/revoke, AI/bulk QR, QR settings and logos, bundles, posts, `links/tweetbot`,
  `links/by-original-url` (deprecated), `links/multiple-by-url` (no response schema), `links/public`
  (public-key route), `links/examples`, deeplinks debug.
- Domain management: create domain, domain settings, DNS records, allowed hostnames, favicon, theme,
  password page, IP exclusions, universal links, S3 export, QR settings, link-signature keys,
  favorite.
- Organization: `planInfo` (no response schema), audit log (`GET /audit`), `tags/bulk`.
