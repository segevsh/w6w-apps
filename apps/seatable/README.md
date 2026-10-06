# SeaTable

Read and write a **SeaTable Cloud** base: rows, SQL, links between records, tables, columns, views
and row comments.

- **Categories** — databases, spreadsheets, productivity
- **Auth methods** — api-token (a base's API Token, exchanged for a Base-Token)
- **Actions** — 23
- **Health checks** — 2 (`service`, ~~`request-rate`~~) + the derived `auth:api-token`
- **Egress allowlist** — `cloud.seatable.io` (the `service` check adds `status.seatable.com` to its
  own hook allowlist, never to the app's)
- **Website** — https://seatable.com/
- **API docs** — https://api.seatable.io/ (and https://docs.seatable.io/)
- **Status page** — https://status.seatable.com/
- **Icon** — `assets/icon.svg` is SeaTable's own `https://seatable.com/favicon.svg` (an SVG
  wrapping the vendor's PNG mark), verbatim. Fallback source: `https://seatable.com/apple-touch-icon.png`.

> **Verified on 2026-10-06** against SeaTable's official API reference (`api.seatable.io`, whose
> pages embed the OpenAPI 3.0 document, `info.version` 6.2) and live probes against
> `cloud.seatable.io` and `status.seatable.com`. No endpoint used here is marked deprecated (the
> reference contains no `deprecat…` text at all). Where the reference was silent, the action was
> left out rather than guessed.

## Connecting

1. In SeaTable open the base, then the three dots next to its name > **Advanced** > **API Token**,
   and add a token. Choose **read-only** or **read/write**; writes need the latter.
2. Paste it as the connection's **API Token**.

A SeaTable API Token belongs to **one base** and never expires, but it cannot call the base
endpoints. It is exchanged (`GET /api/v2.1/dtable/app-access-token/`) for a **Base-Token**, valid
for three days, and the response also names the base (`dtable_uuid`). This app does the exchange when
you connect and again whenever the host asks it to refresh, so:

- a **connection is a base** — no action takes a base id, and a second base needs a second
  connection;
- the Base-Token and API Token are stored as the encrypted credential and never shown. The
  connection's visible details are the base's id, name and the token's permission.

Renewal is requested an hour before the Base-Token's own `exp` claim. It relies on the host running
the auth `refresh` hook for an expired connection; a host that does not would see the connection stop
working after three days until it is reconnected.

## Actions

| Area          | Actions                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| Base          | `base-metadata-get`, `collaborator-list`                                |
| Rows          | `row-list`, `row-get`, `row-append`, `row-update`, `row-delete`, `row-lock`, `row-unlock` |
| SQL           | `sql-query`                                                             |
| Links         | `row-link-list`, `row-link-create`, `row-link-update`, `row-link-delete` |
| Comments      | `row-comment-list`, `row-comment-create`                                |
| Tables        | `table-create`, `table-rename`, `table-delete`                          |
| Columns/views | `column-list`, `column-insert`, `column-delete`, `view-list`            |

## Things that cost a day if you do not know them

1. **Two credentials, one host.** The API Token only works on `/api/v2.1/…` (account operations);
   everything under `/api-gateway/api/v2/dtables/{base_uuid}/…` needs the Base-Token. Using the API
   Token on the gateway is a 403.
2. **Two error spellings.** A bad token is `403 {"error_msg": "Permission denied."}` from the account
   API and `403 {"error_message": "invalid token"}` from the gateway (both measured). The health probe
   and error messages read the body, not the status.
3. **Names versus IDs.** Row, column, table and view actions take **names**. The link actions
   (`row-link-create/update/delete`) take table `_id`s and the 4-character `link_id`, and
   `row-comment-create` takes a table `_id` — all from `base-metadata-get`. In a row object an
   unknown column name is **silently ignored**, so an append can "succeed" and store nothing.
4. **Row results are keyed by internal column key unless you ask.** The vendor default for
   `convert_keys` is off; `row-list`, `row-get` and `sql-query` send it **on** so results use column
   names. Switch it off to get keys.
5. **Limits.** 200 gateway requests/minute per base on Cloud, plus a monthly API limit by plan; an
   exceeded limit is a bare `429`. Per call: 1,000 rows to list/append/update, 10,000 to delete or to
   read with SQL. `row-list` prefills `limit: 100` (the vendor default is the 1,000 maximum). Link
   columns return at most 50 linked records per row.
6. **`sql-query` is not read-only.** SELECT, UPDATE and DELETE all run through it (INSERT only on
   bases with the big-data backend). Bind values with `?` and the Parameters list.

## Health

- **`service`** reads the latest probe of **`Cloud API (Base Operations)`** on SeaTable's status page.
  The page is a [Gatus](https://gatus.io) instance on `status.seatable.com` (`status.seatable.io`
  redirects there). It is *not* an Atlassian Statuspage: the usual `/api/v2/summary.json`,
  `/history.atom` and `/feed.rss` paths all answer 404, behind a 200 SPA shell. Gatus's own
  `GET /api/v1/endpoints/{key}/statuses?page=1&pageSize=1` returns ~4.7 KB for the one component
  instead of the 176 KB all-endpoints history. A failing status API reports `unknown`, never `down`.
- **`request-rate`** is a declared absence (`informational`): the per-minute counts exist only as
  `x-ratelimit-*` headers on gateway responses, and no documented endpoint reports the monthly allowance.
- **`auth:api-token`** (derived from the auth `test`) calls `GET …/dtables/{uuid}/metadata/` with the
  Base-Token — the structure-only call the vendor's quick start uses first, available to a read-only
  token, returning no secret. The exchange endpoint is deliberately **not** the probe: its body is a
  live Base-Token.

## Not covered

- **Self-hosted SeaTable Server and Dedicated.** They live on a host of their own, which a manifest
  cannot name in advance; an API token from such a base is refused at connect time with a clear
  message. Cloud only.
- **Account-level APIs** (creating bases, groups, teams, workspaces, sharing, admin) — these take an
  Account-Token, which is a different, user-wide credential.
- **File and image upload/download** (multi-step upload-link flow), **big-data backend operations**,
  **notifications**, **activity logs**, **snapshots**, **select-option editing**, **column
  update/cascade**, **view create/update/delete**, **duplicate table**, **auto-links**, **webhooks**
  and **common datasets**.
- Table or view **IDs** in place of names for the row endpoints (the vendor accepts `table_id` /
  `view_id` alternatives; this app uses names).
- **Not verified against a live base.** No SeaTable account was available in the build environment:
  request and response shapes come from the vendor's OpenAPI document, and only the unauthenticated
  surface (`/ping`, the 403 bodies for a bad token, the status page) was probed live.
