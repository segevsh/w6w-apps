# Memberstack

Manage members and their free plans, verify member tokens, and read and write Data Table records on
**Memberstack's Admin REST API** (`admin.memberstack.com`).

- **Categories** — security, commerce, databases
- **Auth methods** — secret-key (`X-API-KEY`; `sk_` live, `sk_sb_` sandbox)
- **Actions** — 15
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:secret-key`
- **Egress allowlist** — `admin.memberstack.com` (the `service` check adds `status.memberstack.com`
  to its own hook allowlist, never to the app's)
- **API docs** — https://developers.memberstack.com/admin-rest-api/quick-start
- **Status page** — https://status.memberstack.com/ (Better Stack; the `Admin API` monitor)

> **Verified 2026-10-05** against the markdown versions of Memberstack's Admin REST API pages
> (`quick-start`, `member-actions`, `verification`, `data-tables`, `faqs`, `common-use-cases`) and
> live probes of `admin.memberstack.com` (unauthenticated, malformed-key and unknown-key requests)
> and `status.memberstack.com`. A grep of all six pages for `deprecat|depreciat|sunset|will be
> removed` found nothing. No real key was available, so the success-side responses are as documented,
> not observed.

## Actions

| Action | Route |
|---|---|
| `member-list` | `GET /members` (`limit` ≤ 100, `after` cursor, `order`, `includeJSON`) |
| `member-get` | `GET /members/:id_or_email` (`include=teams`) |
| `member-create` | `POST /members` |
| `member-update` | `PATCH /members/:id` |
| `member-delete` | `DELETE /members/:id` |
| `member-add-plan` / `member-remove-plan` | `POST /members/:id/add-plan` / `remove-plan` (free plans only) |
| `member-verify-token` | `POST /members/verify-token` |
| `data-table-list` / `data-table-get` | `GET /v2/data-tables`, `GET /v2/data-tables/:tableKey` |
| `data-record-create` | `POST /v2/data-tables/:tableKey/records` |
| `data-record-get` | `POST …/records/query` with `findUnique` (the docs have no single-record GET) |
| `data-record-query` | `POST …/records/query` with `findMany` |
| `data-record-update` / `data-record-delete` | `PUT` / `DELETE …/records/:recordId` |

## Things worth knowing

1. **The status code cannot tell you whether the key is valid.** A *malformed or missing* key
   answers `400` and a well-formed *unknown* key answers `401`, both with the body code
   `validation/invalid-secret-key` (measured live). The auth probe therefore reads the body code.
2. **The auth probe is `POST /members/verify-token` with a junk token.** It reads and writes
   nothing and returns no personal data. A key that was accepted gets the documented
   `400 {"code":"INVALID_TOKEN"}`; a rejected key gets `invalid-secret-key`. Anything else is
   reported as "could not be confirmed", never as a pass. (The `INVALID_TOKEN` side is from the
   docs; it could not be seen live without a key.) `GET /members` was rejected as a probe because
   it returns members' emails and custom fields.
3. **A missing member is `200` with `data: null`.** `member-get` reports that as `found: false`.
   Updating or deleting an unknown member is a `400`, and Data Tables use `404`.
4. **`json` is replaced, `customFields` / `metaData` are merged.** On `member-update`, `json` is
   overwritten wholesale; the other two shallow-merge (and `metaData` drops falsy keys).
5. **`member-verify-token` returns `valid: false` for `INVALID_TOKEN`** instead of throwing, since a
   bad token is the answer a workflow branches on. Other failures (bad key, 429, 5xx) still throw.
6. **Two status pages exist; only one is current.** `status.memberstack.com` (Better Stack, updated
   daily, monitors `Admin API`, `Client API`, `Dashboard API`, `SSO`, `Stripe Sync` …) is used, and the
   verdict is the `Admin API` monitor alone — the page roll-up also covers the marketing site and
   e-mail heartbeats this app never calls. `memberstack.statuspage.io` is a legacy Atlassian page
   with three components stamped 2020 and is not used. On the Better Stack host the Atlassian path
   `/api/v2/summary.json` is a bare 301; the data is at `/index.json`.
7. **No quota signal.** Only a flat 25 requests/second limit (`ratelimit-*` headers over a one-second
   window); `quota` is declared unavailable with `severity: informational`.
8. **Data Table create body.** The docs' request-body table and axios example nest the fields under
   `data` (their curl samples show them flat); `data` (+ optional `memberId`) is what is sent.
   DECIMAL fields come back as strings from create/update/delete and as numbers from query.
9. **Paging Data Tables.** `after` only pages correctly when every request sends
   `orderBy: {"internalOrder": "asc"}`; `skip` and `after` cannot be combined, nor `include` and
   `select` (both refused locally, before a request is spent).

## Left out

- **Listing plans** — the Admin REST API documents no plans endpoint, so there is none here
  (plan ids come from the dashboard).
- **Paid plans** — the Admin REST API only adds/removes FREE plans; paid plans need Stripe checkout
  through the DOM SDK.
- **Webhook signature verification** — the docs say it is not available over REST (Node package
  only).
- **Creating tables or fields** — Data Tables are created in the dashboard.
- **The front-end DOM SDK** (`@memberstack/dom`) — not an Admin REST API.

## Icon

`assets/icon.svg` embeds, base64 and unmodified, the 32×32 PNG served at
https://developers.memberstack.com/favicon.png (md5 `0f64ea05f7eb28442bd2bed20dc60ff8`).
