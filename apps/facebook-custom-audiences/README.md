# Facebook Custom Audiences

Create and manage Meta **custom audiences** — customer lists, their members, and lookalikes —
through the Marketing API, with Meta's required SHA-256 customer-data hashing applied
**inside the app**.

- **Categories** — marketing, social-media
- **Auth methods** — oauth2 (scopes `ads_management`, `ads_read`)
- **Actions** — 9
- **Egress allowlist** — `graph.facebook.com`
- **Graph API version** — `v25.0` (the version `facebook-conversions` pins)
- **API docs** — [Custom Audience][ca], [Custom Audience Users][users],
  [Ad Account customaudiences][edge], [Customer File Custom Audiences][guide],
  [Lookalike Audiences][lal]
- **Icon** — the in-tree Facebook mark, copied byte-for-byte from `apps/facebook-conversions/assets/icon.svg`

## Actions

| Action | Call |
|---|---|
| `list-ad-accounts` | `GET /me/adaccounts` |
| `list-custom-audiences` | `GET /act_{id}/customaudiences` |
| `get-custom-audience` | `GET /{audience_id}` |
| `create-custom-audience` | `POST /act_{id}/customaudiences` (`subtype=CUSTOM`) |
| `update-custom-audience` | `POST /{audience_id}` |
| `delete-custom-audience` | `DELETE /{audience_id}` |
| `add-users` | `POST /{audience_id}/users` |
| `remove-users` | `POST /{audience_id}/users` with `method=DELETE` |
| `create-lookalike-audience` | `POST /act_{id}/customaudiences` (`subtype=LOOKALIKE`) |

Typical flow: `list-ad-accounts` → `create-custom-audience` → `add-users` → `get-custom-audience`
(wait for `delivery_status.code` 200) → `create-lookalike-audience`.

## How customer data is hashed

`add-users` and `remove-users` take a list of plain objects:

```json
[{ "email": "Mary@Example.com ", "phone": "+1 (555) 987-6543", "firstName": "Mary", "country": "US" }]
```

Columns: `email`, `phone`, `gender`, `birthYear`, `birthMonth`, `birthDay`, `firstName`,
`lastName`, `firstInitial`, `city`, `state`, `zip`, `country`, `madid`, `externalId` (Meta's own
key names such as `FN` or `DOBY` also work). Each value is normalised per Meta's
Customer File guide and hashed with SHA-256 (WebCrypto), then sent as `payload.schema` /
`payload.data`:

| Key | Rule applied |
|---|---|
| `EMAIL` | trim, lowercase; must look like an address |
| `PHONE` | digits only, leading zeroes dropped — **include the country code yourself** |
| `GEN` | `m` or `f` |
| `DOBY` / `DOBM` / `DOBD` | `YYYY` (1900 to this year) / `MM` / `DD` |
| `FN` / `LN` / `CT` | lowercase letters only; no punctuation or whitespace (non-ASCII letters kept) |
| `FI` | first letter, lowercase |
| `ST` | lowercase, no punctuation or whitespace (US: send the 2-letter code) |
| `ZIP` | lowercase, no whitespace; US ZIP+4 cut to 5 digits |
| `COUNTRY` | 2-letter ISO 3166-1 alpha-2, lowercase |
| `MADID` | lowercased, **not hashed**, hyphens kept |
| `EXTERN_ID` | **not hashed**, sent as given |

Verified against Meta's published examples (`tests/lib/audience-data.test.ts`):
`sha256("mary@example.com") = f1904cf1…bb79`, `sha256("15559876543") = 1ef97083…6a4e`.

- A value that is already a 64-hex digest passes through untouched. `hashing: "pre-hashed"`
  refuses anything else, for workflows that must never hold raw PII.
- A column missing from some rows is sent as `""`, which is how Meta marks a key unknown.
- Errors name the row and column (`users[3].EMAIL`) and **never the value**, since errors are
  persisted with the run.

### Batches and sessions

Meta accepts at most 10,000 rows per request; the action refuses more before any call. A
single request is sent as a one-batch session (`batch_seq: 1`, `last_batch_flag: true`). For larger
lists set the same **Session ID** on every request, number them with **Batch number**, and set
**Last batch** true only on the final one. Changes take up to 24 hours to appear in the audience.

## Not covered (left out on purpose)

- **Website, app, engagement and catalog audiences** (`rule`, `event_sources`, pixel-based
  creation) and the other `subtype`s. Meta states some subtypes (`IG_BUSINESS`, `FB_EVENT`,
  `EXPERIMENTAL`, `MULTI_DATA`) cannot be created through the API at all.
- **`/usersreplace`** (replace all members) — described only in the guide's prose, with no reference page to verify its parameters against.
- **`/act_{id}/usersofanyaudience`** (opt a person out of every audience) — the reference gives
  a DELETE with "the same fields as a user update" and no parameter table.
- **Audience sharing** (`/{id}/adaccounts`), **sessions**, **health** edges.
- **Lookalikes from campaign or ad-set conversions** (`origin_ids`, `conversion_type`) and
  `location_spec`; only seed-audience lookalikes by `country` are built.
- Mobile-app inclusion targeting and the iOS 14+ items, which Meta lists as no longer supported.
- Value-based audiences (`LOOKALIKE_VALUE`, `is_value_based`) and `DATA_PROCESSING_OPTIONS` (LDU).

## Behaviour worth knowing

- **Custom Audience Terms of Service** must be accepted on the ad account (error `200` /
  subcode `1870090` otherwise). The app cannot accept them for you.
- **Flagged audiences** (`operation_status.code` 471, since 2025-09-02) cannot be edited or have
  members changed until resolved in Audience Manager; Meta's error text is surfaced verbatim.
- **Delete** is permanent and fails (error `2656`) while lookalikes built from the audience exist.
- Seeds for a lookalike need at least 100 members; population takes 1–6 hours.
- Rate limiting: error `80003` is a per-ad-account custom-audience limit.
- `list-ad-accounts` uses `GET /me/adaccounts`. The rendered reference page for that edge could
  not be fetched, so the edge and its field names are confirmed from Meta's own Business SDK
  (`User.get_ad_accounts` → `endpoint='/adaccounts'`; `AdAccount` fields) rather than the page.
- The Customer File guide marks `session` as required while the Users reference marks it
  optional; the app always sends one.

## Health

- `service` — **declared unavailable**. `metastatus.com` answers 200 `text/html` with the same
  1,401-byte shell for `/`, `/rss`, `/feed` and `/api/v1/status` (re-checked 2026-10-05); there is
  no feed or JSON to read.
- `quota` — reads `X-App-Usage` and `X-Business-Use-Case-Usage` from `GET /me?fields=id`;
  informational.
- Auth probe — `GET /me?fields=id`: needs no ads permission and returns only the caller's own id,
  never the token. Validity is judged from the body (`id` present, or Graph error code `190`),
  not the status code.

[ca]: https://developers.facebook.com/docs/marketing-api/reference/custom-audience/
[users]: https://developers.facebook.com/docs/marketing-api/reference/custom-audience/users
[edge]: https://developers.facebook.com/docs/marketing-api/reference/ad-account/customaudiences
[guide]: https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences/
[lal]: https://developers.facebook.com/docs/marketing-api/audiences/guides/lookalike-audiences/
