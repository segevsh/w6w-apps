# Kit

Kit (formerly ConvertKit) subscribers, tags, forms, sequences, broadcasts, and custom fields, on the
**Kit API v4**.

- **Categories** — marketing, email
- **Auth methods** — api-key
- **Actions** — 18
- **Egress allowlist** — `api.kit.com`
- **Website** — https://kit.com
- **API docs** — https://developers.kit.com/api-reference/overview
- **OpenAPI spec** — https://developers.kit.com/api-reference/v4.json

## The rename, and the API version this app targets

Two separate changes happened, and conflating them is the easy way to build against a dead API:

1. **ConvertKit → Kit.** The company rebranded. `developers.convertkit.com` now returns a **301** to
   `developers.kit.com` (verified 2026-08-03). The GitHub org
   [github.com/convertkit](https://github.com/convertkit) still exists and is titled "ConvertKit
   (now Kit)", though it currently publishes no public repositories.
2. **API v3 → v4.** A genuinely different API, not just a new hostname. Kit's own overview states:
   _"Kit API V4 is the latest version of our API. API V3 is still available for use but is
   deprecated and will be sunset in the future."_ No sunset **date** has been published — we looked,
   and could not find one. V3 is described as no longer in active development, with new
   functionality landing only in v4.

**This app is built entirely on v4.** The difference that matters most is not the version number but
the credential's position on the wire:

|            | v3 (deprecated)                               | v4 (this app)               |
| ---------- | --------------------------------------------- | --------------------------- |
| Base URL   | `https://api.convertkit.com/v3`               | `https://api.kit.com/v4`    |
| Credential | `api_key` / `api_secret` **query parameters** | `X-Kit-Api-Key` **header**  |
| Pagination | page numbers                                  | cursor (`after` / `before`) |

A secret in a query string ends up in access logs, proxy caches and `Referer` headers. v4's header
is the better posture on its own merits, before the deprecation is even considered.

> **Note for whoever maintains the candidate list:** our own app-candidate list still points at
> `http://developers.convertkit.com/#api-basics` — the v3 docs. That link is stale in both ways
> described above. It should be updated to https://developers.kit.com/.

## Auth

Kit v4 supports **two** credentials:

- **API key** (shipped here) — a `X-Kit-Api-Key` header. No app registration, no redirect URI, no
  client secret. Kit describes it as intended for personal account automation. Allowance: 120
  requests per rolling 60 seconds.
- **OAuth 2.0** — authorization-code grant with a refresh-token flow, plus a PKCE variant for SPAs
  and mobile. Intended for apps listed in the Kit App Store, and carries a higher allowance (600
  requests per 60 seconds). Endpoints are `https://api.kit.com/v4/oauth/authorize` and
  `.../oauth/token`, scopes `read` and `write`.

We ship the API key because it needs no registration to be useful. **OAuth 2.0 exists** and is the
right choice for a multi-creator App Store listing or if the 120/minute ceiling becomes the binding
constraint — add it as a second `AuthDefinition` when that day comes.

Get a key at **kit.com → Settings → Developer**. It must be a **V4** key; V3 keys are not accepted.

## Actions

| Resource     | Action                       | Endpoint                                       |
| ------------ | ---------------------------- | ---------------------------------------------- |
| Account      | `get-account`                | `GET /v4/account`                              |
| Subscriber   | `list-subscribers`           | `GET /v4/subscribers`                          |
| Subscriber   | `get-subscriber`             | `GET /v4/subscribers/{id}`                     |
| Subscriber   | `create-subscriber`          | `POST /v4/subscribers`                         |
| Subscriber   | `update-subscriber`          | `PUT /v4/subscribers/{id}`                     |
| Tag          | `list-tags`                  | `GET /v4/tags`                                 |
| Tag          | `create-tag`                 | `POST /v4/tags`                                |
| Tag          | `tag-subscriber`             | `POST /v4/tags/{tag_id}/subscribers`           |
| Tag          | `remove-tag-from-subscriber` | `DELETE /v4/tags/{tag_id}/subscribers/{id}`    |
| Form         | `list-forms`                 | `GET /v4/forms`                                |
| Form         | `add-subscriber-to-form`     | `POST /v4/forms/{form_id}/subscribers`         |
| Sequence     | `list-sequences`             | `GET /v4/sequences`                            |
| Sequence     | `add-subscriber-to-sequence` | `POST /v4/sequences/{sequence_id}/subscribers` |
| Broadcast    | `list-broadcasts`            | `GET /v4/broadcasts`                           |
| Broadcast    | `get-broadcast`              | `GET /v4/broadcasts/{id}`                      |
| Broadcast    | `create-broadcast`           | `POST /v4/broadcasts`                          |
| Custom field | `list-custom-fields`         | `GET /v4/custom_fields`                        |
| Custom field | `create-custom-field`        | `POST /v4/custom_fields`                       |

Every path above was taken from Kit's published v4 OpenAPI document, not from memory.

### Three behaviours worth knowing before you wire a workflow

1. **Adding to a form, a sequence, or a tag does not create the subscriber.** Kit is explicit that
   "the subscriber being added must already exist" on all three endpoints, and returns `404`
   otherwise. Put `create-subscriber` upstream of them.
2. **`create-subscriber` is an upsert, but not a full one.** A repeat email address has its first
   name updated and returns `200` rather than duplicating. Kit does **not** support changing `state`
   through this endpoint once the subscriber exists — the `state` param applies on creation only.
3. **`create-tag` is idempotent on name, matched case-insensitively.** An existing name returns
   `200` with the existing tag; a new one returns `201`. `create-custom-field` is _not_ — a
   duplicate label is a `422`.

### Pagination

Every list endpoint is cursor-paginated and returns the same envelope:

```json
{
  "tags": [ ... ],
  "pagination": {
    "has_previous_page": false,
    "has_next_page": true,
    "start_cursor": "...",
    "end_cursor": "...",
    "per_page": 500
  }
}
```

Each list action takes `perPage` (default 500, max 1000), `after`, `before`, and
`includeTotalCount`. To walk forward, pass the previous response's `pagination.end_cursor` as
`after`. Request `includeTotalCount` on the first page only — Kit warns it is slow.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — <https://status.kit.com>

```
GET https://status.kit.com/api/v2/summary.json
```

Atlassian Statuspage. Verified live 2026-08-03, serving components **MCP, Integrations, Marketing
Site, Application, Email sending, API**. That breakdown is the reason this app probes `summary.json`
rather than the cheaper `status.json`: a workflow can be entirely healthy while the Marketing Site
is down, and entirely broken while it is up. The legacy `status.convertkit.com` and
`convertkit.statuspage.io` resolve to the same page; `status.kit.com` is the current canonical host.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself.

```
GET /v4/account
```

Kit's documented "which account am I" call, and the cheapest read an API key can make. It requires
no additional scope, so it cannot report a working credential as broken.

### Do we have quota left?

**Nothing to read.** Declared `unavailable`, not silently omitted.

Kit publishes a hard allowance in prose — 120 requests per rolling 60 seconds for an API key, 600
for OAuth — but emits **no rate-limit response headers**. Two independent confirmations, both
2026-08-03:

1. Kit's v4 OpenAPI document contains no `RateLimit-*`, `X-RateLimit-*` or `X-Rate-Limit-*` header
   anywhere — not in a response, not in a component.
2. A live `GET https://api.kit.com/v4/account` returns only `x-request-id` and `x-runtime` among its
   custom headers. No counter.

So unlike Brevo (`x-sib-ratelimit-*`) or Klaviyo (`RateLimit-*`), there is nothing to parse. The
120/minute figure is a published constant, not a live reading; reporting it as remaining headroom
would be inventing a number Kit does not expose, and would be wrong the moment anything else shares
the credential.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key            | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                |
| -------------- | ---------- | ---------- | ---------- | ------------- | ------------ | ---------------------------------------------------- |
| `service`      | service    | app        | none       | degraded      | 60s          | `health/service.ts`                                  |
| `quota`        | quota      | connection | signed     | informational | —            | **`unavailable`** — no headers exist to read         |
| `auth:api-key` | credential | connection | signed     | fatal         | —            | derived from the `api-key` auth method's `test` hook |

The host `status.kit.com` is reachable **only inside the `service` hook's worker** — it is not on
`w6w.network.allow`, so no action can reach it. The spec allows that widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

`quota`'s `severity: "informational"` is load-bearing: an `unavailable` entry always reports
`unknown`, and `unknown` outranks `ok` in the roll-up, so at any other severity a declared absence
would pin every verdict at `unknown` forever.

## Links

- **Vendor site** — https://kit.com
- **Developer docs** — https://developers.kit.com
- **API v4 reference** — https://developers.kit.com/api-reference/overview
- **Authentication** — https://developers.kit.com/api-reference/authentication
- **OpenAPI v4 document** — https://developers.kit.com/api-reference/v4.json
- **Status page** — https://status.kit.com
- **GitHub org** — https://github.com/convertkit ("ConvertKit (now Kit)" — currently no public
  repositories)
- **Brand assets** — https://kit.com/brand (source of `assets/icon.svg`, the official
  `kit-logo-soft-black.svg` mark)


## Icon

`assets/icon.png` — Kit's app icon; the previous artwork was the wordmark at 2.2:1, which a square tile cannot hold.

Taken from <https://kit.com/android-chrome-512x512.png> on 2026-08-15.

- **14,761 bytes**, `image/png`, 512 × 512, md5 `b37afe36ec8f075b3d509919485906a5`
- raster, because the vendor publishes no vector of this mark

Kit publishes vectors of the wordmark only (`media.kit.com/images/logos/kit-logo-*.svg`, 2.2:1), which is what this app used to ship. The square icon exists as a raster only, and at 512px it is sharper on the tile than the vector wordmark was legible.

---

Researched and endpoint-verified against Kit's live v4 OpenAPI document on 2026-08-03. Every path,
parameter, request body and response envelope in this app was read out of that document rather than
recalled. Status surfaces move; re-check with `_tools/audit.ts` conventions in mind if a probe
starts failing for everyone at once.
