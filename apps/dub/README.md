# Dub

Create, update and track short links, manage domains, folders and tags, read click/lead/sale
analytics and events, and record lead and sale conversions, over the **Dub API**.

- **Categories** — marketing, analytics
- **Auth methods** — api-key (`Authorization: Bearer dub_xxx`)
- **Actions** — 29
- **Health checks** — `service` (status.dub.co, API component), `api` (unsigned reachability),
  `quota` (rate-limit headroom) + the derived `auth:api-key`
- **Egress allowlist** — `api.dub.co`
- **API docs** — https://dub.co/docs/api-reference
- **Icon** — the vendor's own mark, https://assets.dub.co/favicons/apple-touch-icon.png (1600x1600
  PNG, embedded verbatim as a base64 data URI in an SVG wrapper)

Everything here was verified on 2026-10-06 against the OpenAPI blocks embedded in each
`dub.co/docs/api-reference/<group>/<op>.md` page (there is no standalone openapi.json) and live
probes of `api.dub.co`.

## Things most likely to go wrong

1. **Keys are workspace-scoped and can be restricted.** A restricted key gets `403 forbidden` on
   endpoints outside its scope. The credential test treats that as a valid key.
2. **A missing key and a wrong key are both `401`.** They differ only in `error.message`
   ("Missing Authorization header." vs "Unauthorized: Invalid API key."). Errors are
   `{error:{code,message,doc_url}}`.
3. **Pagination differs per resource.** Links and customers use cursors (`startingAfter` /
   `endingBefore`, `pageSize` up to 100; `page` is deprecated and not exposed). Folders use
   `page`/`pageSize` (max 50), tags `page`/`pageSize` (max 100), events `page`/`limit` (max 1000).
4. **Bulk create reports per-link failures inside a 200**, as `{link, error, code}` entries in
   `errors`. Check the result, not the status.
5. **Rate limits are per minute** (Free 60, Pro 600, Business 1,200, Advanced 3,000) although the
   header table says "per hour". Analytics and events have their own per-second limits and are
   unavailable on Free. `X-RateLimit-Reset` is epoch seconds.
6. **Deprecated fields are not exposed:** link `tagId`/`withTags`/`publicStats`/`webhookIds`,
   events `order`, analytics `qr`/`programId`/`tagIds`, tag body `tag`.

## Actions

| Area      | Actions                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| Links     | `link-create`, `link-update`, `link-upsert`, `link-delete`, `link-get`, `link-list`, `link-count`, `link-bulk-create`, `link-bulk-update`, `link-bulk-delete` |
| Domains   | `domain-create`, `domain-update`, `domain-delete`, `domain-check-availability`                                           |
| Folders   | `folder-list`, `folder-create`, `folder-update`, `folder-delete`                                                         |
| Tags      | `tag-list`, `tag-create`, `tag-update`                                                                                   |
| Analytics | `analytics-get`, `event-list`                                                                                            |
| Customers | `customer-list`, `customer-get`, `customer-update`, `customer-delete`                                                    |
| Tracking  | `track-lead`, `track-sale`                                                                                               |

## Health

- **Credential** — derived from `Auth.test`, which probes `GET /links?pageSize=1` (Dub has no whoami
  endpoint). An array body is a pass, a `403 forbidden` is a pass (restricted key), anything else
  reports the vendor's message. The key is never echoed.
- **service** — `status.dub.co` serves the Statuspage v2 shape; the pinned page id and the `API`
  component decide. Link Redirects is capped at degraded. A wrong page, missing component, 5xx or bad
  JSON is `unknown`.
- **api** — unsigned `GET /links`; a `401` carrying the error envelope is a pass.
- **quota** — reads `X-RateLimit-*` off a signed `GET /links?pageSize=1`; `429` is down, missing
  headers are `unknown` (informational).

## Not covered

Left out, not guessed: the partner program (partners, applications, bounties, commissions, payouts,
discount codes, and the analytics groupings/filters `top_partners`, `top_groups`,
`top_partner_tags`, `partnerId`, `groupId`, `partnerTagId`); listing domains (the docs have no page,
though `GET /domains` exists); registering domains (Enterprise only); link A/B-test fields
(`testVariants` etc.); `programId`/`partnerId` on links; `groupBy` on `link-count`; `track/open`.
