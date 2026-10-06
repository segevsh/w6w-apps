# Lob

Print and mail postcards, letters, self-mailers and checks, verify and autocomplete addresses, and
manage address books, HTML templates and bank accounts, on the **Lob API**.

- **Categories** — marketing, developer-tools
- **Auth methods** — api-key (HTTP Basic: key as username, empty password)
- **Actions** — 37
- **Health checks** — 2 (`service`, ~~`rate-limit`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.lob.com` (the `service` check adds `lob.statuspage.io` to its own hook
  allowlist, never to the app's)
- **Website** — https://www.lob.com/
- **API docs** — https://docs.lob.com/
- **OpenAPI** — https://github.com/lob/lob-openapi (`dist/lob-api-bundled.yml`, `info.version` 1.22.0)
- **Status page** — https://status.lob.com/ (redirects to `lob.statuspage.io`)

> **Everything below was verified on 2026-10-06** against Lob's own OpenAPI 3.0.3 document
> (994,103 bytes, `info.version` 1.22.0, server `https://api.lob.com/v1`) and live probes of
> `api.lob.com` and `status.lob.com`. Nothing came from a third-party integration directory. The
> only thing that could not be exercised live is a *successful* call: no Lob key was available, so
> every request and response shape is from the document, and every error shape is from the wire.

## Things most likely to go wrong

### 1. Test and live are the same host — the key decides

There is one host, `https://api.lob.com/v1`. A `test_…` key runs Lob's sandbox (nothing is printed,
mailed or billed; `intl_verifications` returns a dummy response based on the primary line) and a
`live_…` key prints, bills and posts real mail. Connect **one Connection per environment**; the
Connection label shows `Lob (test)` or `Lob (live)`, read from the key prefix.

### 2. A missing key and a wrong key are both HTTP 401

Measured live: no credential answers `401 {"error":{"code":"unauthorized","message":"Missing
authentication"}}`; a well-formed unknown key answers `401 {"error":{"code":"invalid_api_key"}}`.
The credential check classifies from the body's `code`, never the status, and tells you which case
you hit (the first means the key never reached the request — reconnect; the second means it is
wrong or rolled). A schema-correct non-auth error (a 403 on its merits, say) proves the key was
accepted; a 5xx, a 429 or an unreadable body is inconclusive and never reported as a pass.

### 3. A bank-account read returns the full account number

Lob's `bank_account` schema marks `account_number` required in every response, so
`GET /bank_accounts` and `GET /bank_accounts/{id}` echo the number of the account checks are drawn
on. A workflow step's result is persisted and echoed into logs and other apps, so every bank-account
action deletes `account_number` before returning. The routing number (public) is kept.

### 4. A retry can mail twice

A mailpiece create is the one place a retried step costs a physical item. Every create sends Lob's
`Idempotency-Key` header: the caller's own `Idempotency key` param, else the run's `invocationId`,
else none. The creates are still declared `idempotent: false` because the key is not guaranteed to
be present.

### 5. `use_type` is required, and scheduling is a paid feature

Every mailpiece create requires `use_type` (`marketing` | `operational`; Lob permits null only when
an account default is set, which this app never relies on). Cancelling (`DELETE`) is documented as
possible only when the piece has a `send_date` that has not passed; scheduling and cancellation are
a paid Print & Mail edition feature.

## Auth

| | |
| --- | --- |
| Scheme | HTTP Basic — `Authorization: Basic base64("<key>:")` (empty password) |
| Field | `apiKey` (secret) |
| Keys | secret `test_…` / `live_…`; publishable `test_pub_…` / `live_pub_…` (verification and autocomplete only) |
| Where | Lob Dashboard > Settings > API Keys |

`sign` is the only code that sees the key. The key is never put in a URL.

**Credential probe.** For a secret key: `GET /v1/addresses?limit=1` — free, read-only, needs a
credential, and returns the caller's own address book rather than any credential (no `/me`-style
whoami exists, and none that echoes a key was used). For a publishable key (refused by that
endpoint by design): `POST /v1/us_autocompletions {"address_prefix":"1"}`, the call it is allowed to
make.

## Actions

| Group | Actions |
| --- | --- |
| Addresses | `address-list`, `address-get`, `address-create`, `address-delete` |
| Verification | `us-verify`, `intl-verify`, `us-autocomplete`, `us-zip-lookup` |
| Postcards | `postcard-list`, `postcard-get`, `postcard-create`, `postcard-cancel` |
| Letters | `letter-list`, `letter-get`, `letter-create`, `letter-cancel` |
| Self mailers | `self-mailer-list`, `self-mailer-get`, `self-mailer-create`, `self-mailer-delete` |
| Checks | `check-list`, `check-get`, `check-create`, `check-cancel` |
| Templates | `template-list`, `template-get`, `template-create`, `template-update`, `template-delete`, `template-version-list`, `template-version-create` |
| Bank accounts | `bank-account-list`, `bank-account-get`, `bank-account-create`, `bank-account-verify`, `bank-account-delete` |
| Account | `credits-balance-get` |

Conventions:

- **Lists** answer `{items, count, totalCount?, nextCursor, previousCursor}`. Paging is cursor-based:
  pass `nextCursor` back as `After`. `limit` is 1-100 (Lob's default is 10). `totalCount` appears
  only with `Include total count` (`include[]=total_count`). `After` and `Before` together are
  refused. Date and metadata filters use Lob's bracket form (`date_created[gt]=…`,
  `metadata[campaign]=…`).
- **`To` / `From`** take either a saved address id (`adr_…`) or an inline address object.
- **Artwork** (`front`/`back`/`file`/`inside`/`outside`) takes HTML, a public URL, or a template id
  (`tmpl_…`). Uploading a local file (multipart) is not covered.
- **Rate limits:** 150 requests per 5 seconds per key per endpoint (300 for US verification and
  autocomplete); a refused call is 429 `rate_limit_exceeded`.

## Health checks

- **`service`** — Atlassian Statuspage at `lob.statuspage.io/api/v2/summary.json` (`status.lob.com`
  answers `302` to it, and the runtime allowlists the URL it is given, not the redirect target).
  Verified: `summary.json` 200 / 2,847 B, `status.json` 200, a nonsense path 404 (not a catch-all);
  `page.name` `Lob`, `page.id` `2xkb3rfdd3lg`; components `API`, `Dashboard`, `Webhooks` — the `API`
  component covers `api.lob.com`. The check pins the page **id** and name (the page's own `url`
  reads the vanity host), trusts `status.indicator` as the verdict, and reports a failed or
  unrecognised fetch as `unknown`, never `down`.
- **`rate-limit`** — declared `unavailable`, severity `informational`. Lob exposes headroom only as
  response headers on the endpoint being called, and there is no quota endpoint; `GET /accounts` is
  the Lob Credits balance, not API headroom.
- **`auth:api-key`** — derived from the auth `test` hook above.

## Deliberately not covered

Confirmed in the spec but out of the core surface requested; each is a candidate for a follow-up:
billing groups, booklets, buckslips (+ orders), campaigns, cards (+ orders), creatives, identity
validation, informed-delivery campaigns, QR-code analytics, resource proofs, snap packs, uploads
(bulk CSV mailings and their exports/reports), URL shortener (domains, links), bulk US/intl
verification, reverse-geocode lookups, and multipart local-file artwork. Webhooks are configured in
the Lob Dashboard (the OpenAPI document declares no webhook-management endpoints) and are out of
scope here. The spec's only deprecation notes are the sunset of API versions prior to 2019-02-11
and a "deprecation planned" `address_placement` value (`bottom_first_page_center` is exposed as
documented — it is still live).

## Icon

`assets/icon.svg` embeds Lob's own 256x256 web-app mark verbatim as a base64 PNG inside an SVG
wrapper. Source: the `apple-touch-icon` link on `lob.com`
(`https://cdn.prod.website-files.com/5e1e5c62fa3d4447af417098/6348790a6940a6b92f0a188f_Lob%20Webclip.png`,
3,564 bytes, fetched 2026-10-06). No vector was found: `simpleicons.org/icons/lob.svg`,
`lob.com/favicon.svg` and the `lob-openapi` repo all 404. Nothing was drawn.

## Layout

```
index.ts            default export { actions, auth, healthChecks }
auth/api-key.ts     Basic auth sign, probe, environment label
actions/            one file per action
health/             service (status page), rate-limit (unavailable)
lib/client.ts       LobClient, error formatting, query/cursor helpers, bank-number redaction
lib/params.ts       shared pagination/filter/create params
lib/mail.ts         shared mailpiece body + idempotency key
tests/              unit tests with a mocked HookContext (fake ctx.fetch)
```

## Development

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```

Use `deno task fmt`, never bare `deno fmt` (the bare form rewrites `assets/icon.svg`).
