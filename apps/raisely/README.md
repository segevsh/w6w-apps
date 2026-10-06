# Raisely

Read and manage campaigns, fundraiser profiles, donations, users (supporters and donors), recurring
subscriptions and tags on **Raisely**, the fundraising platform, over the **Raisely API v3**.

- **Categories** — crm, commerce, marketing
- **Auth methods** — api-key
- **Actions** — 22
- **Health checks** — 3 (`service`, `api`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.raisely.com` (the `service` check adds `www.raiselystatus.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://raisely.com/
- **API docs** — https://developers.raisely.com/reference
- **OpenAPI** — https://dash.readme.com/api/v1/api-registry/22eckcdmr9pu3rj (OpenAPI 3.0.0,
  `info.title` "Raisely API", 539,791 bytes)
- **Status page** — https://www.raiselystatus.com (`status.raisely.com` redirects here)

> Everything below was verified on 2026-10-06 against Raisely's own OpenAPI document (the ReadMe
> registry document behind `developers.raisely.com/reference`) and live probes against
> `api.raisely.com`. Nothing came from a third-party integration directory.

## Authentication

An API key from **Raisely > Settings > API & Webhooks**, sent as `Authorization: Bearer <key>` by
the auth `sign` hook (`components.securitySchemes.BearerAuth`). The spec's second scheme,
`QueryToken` (`?accessToken=`), is deliberately not offered — a credential in a URL gets logged.

The credential probe is `GET /v3/campaigns?private=true&limit=1`, classified from the response
**body**:

| Request                   | Measured live                                                                |
| ------------------------- | ---------------------------------------------------------------------------- |
| no key                    | `403 {"code":"forbidden","detail":"You are not authorized to do that"}`      |
| bogus bearer              | `401 {"code":"unauthorized", errors[0].subcode:"invalid token"}`             |
| valid key (per the spec)  | `200 {"data":[...],"pagination":{...}}`                                      |

A 2xx must also carry the `{data: [...]}` envelope to count as a pass.

## The things most likely to cost someone a day

1. **Anonymous callers are valid.** The spec's global security is `[{}, {BearerAuth}]` — the empty
   requirement means "no credential needed". A list that answers is therefore not proof the key
   was checked, and an authenticated read without `private=true` returns only public fields. Every
   read here sends `private=true` by default (a param you can turn off).
2. **User records carry a login token.** `accessToken` ("a secret token for this user, used to
   authenticate them against the API") is part of the user schema, and users are nested inside
   profiles. `lib/client.ts` strips that key at any depth from every response.
3. **Bodies are wrapped, with siblings.** Writes are `{"data": {...}}` with `overwriteCustomFields`
   (PATCH) or `merge` (`POST /users`) as top-level siblings of `data`; the `public` / `private`
   custom-field objects live inside `data`. In this app's forms the `private` custom-field object is
   the `private_fields` param, because `private` is already the read-the-full-record flag.
4. **Paging is `limit`/`offset`**, not pages; the response's `pagination` carries `total`, `pages`,
   `offset`, `limit`, `prevUrl`, `nextUrl`. The spec states no maximum `limit` and no default.
5. **Ids are uuids, paths or domains.** Campaigns accept a uuid, path or domain; profiles a uuid or
   path. Segments are percent-encoded.

## Actions

| Resource     | Actions                                                                         |
| ------------ | ------------------------------------------------------------------------------- |
| campaign     | `campaign-list`, `campaign-get`, `campaign-update`                              |
| profile      | `profile-list`, `profile-get`, `profile-update`                                 |
| donation     | `donation-list`, `donation-get`, `donation-create`, `donation-update`           |
| user         | `user-list`, `user-get`, `user-create`, `user-update`                           |
| subscription | `subscription-list`, `subscription-get`, `subscription-update`                  |
| tag          | `tag-list`, `tag-get`, `tag-record-list`, `tag-record-add`, `tag-record-remove` |

`donation-create` records a gift (offline or custom); it deliberately takes no payment-gateway
fields (`token`, `card`, `customer`, `gatewayVersion`) and so cannot charge a card.

## Health checks

- **`service`** — Statuspage at `https://www.raiselystatus.com/api/v2/summary.json`
  (`page.name` "Raisely", page id `hxx1hf9gkz5h`, Statuspage schema: `status.indicator`,
  `components[].status`). Six components exist — Websites, Donation & Payment Processing,
  Registration & Ticketing Processing, Marketing Automation, **API** (`56pzw35gk2ff`), Admin Panel.
  Only the API component decides the verdict, pinned by id. A broken status feed reports `unknown`,
  never `down`.
- **`api`** — an unsigned `GET /v3/campaigns?private=true&limit=1`. Raisely's JSON `forbidden` /
  `unauthorized` body passes: it proves DNS, TLS and the auth layer ran. An HTML shell or a 5xx is
  `down`.
- **~~`quota`~~** — declared unavailable (`informational`). The spec declares a `429`
  (`rate limit exceeded`) on every operation but states no limit, no rate-limit header and no usage
  endpoint.
- **`auth:api-key`** — derived from the auth `test` hook (the probe above).

## Not covered (left out rather than guessed)

Present in the OpenAPI document but not implemented here:

- `POST /profiles` — **there is no such endpoint**; profiles are created as a side effect of
  `POST /campaigns/{campaign}/register` (a public sign-up flow that also creates the user and may
  take payment), which this app does not wrap.
- Subscription **create** (`POST /subscriptions`) — requires a payment-gateway `token` for online
  subscriptions; update/list/get are covered.
- Campaign **create / delete / restore**, campaign `config/{attribute}`, designations, media,
  products, orders, posts, promo codes, segments, interactions and interaction categories,
  exercise logs, profile `join` / `leave` / `members`, donation `move` / `match` / `resend` /
  receipts, users `upsert` and access-token minting (`/users/{uuid}/access-tokens`), webhooks
  (CRUD), the `/login`, `/logout`, `/signup`, `/check-user`, `/authenticate` and `/users/magic-link`
  authentication endpoints (the last group returns or mints credentials and is intentionally
  excluded).
- Nested list routes (`/campaigns/{c}/profiles`, `/campaigns/{c}/donations`,
  `/users/{u}/donations`, ...) — the top-level lists with their `campaign` / `profile` / `user`
  filters cover the same ground.

## Development

```bash
deno task validate && deno task check && deno task lint && deno task fmt && deno task test
```
