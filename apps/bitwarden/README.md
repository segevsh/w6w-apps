# Bitwarden

The Bitwarden **organization Public API**: members, groups, collections, policies, event logs,
subscription limits and directory import. 28 actions, one auth method, one declared health absence.

Every path, verb, parameter and enum comes from the live OpenAPI 3.0.4 document published at
<https://bitwarden.com/help/api/> (16 paths, 28 operations), and was probed against the live
identity and API hosts on 2026-10-05.

## Out of scope

- **The Vault Management API** (`bw serve`). It is a local process run by the Bitwarden CLI, not a
  hosted API, so there is no host to call. Reading or editing vault items is not possible here.
- **Self-hosted servers** (`https://your.domain/api`). An arbitrary host cannot be allowlisted
  without `"*"`, which this app does not use.
- **The Gov cloud.** The spec lists a Gov token URL (`identity.bitwarden-gov.com`) among its
  security schemes but declares no Gov API server, so the API host is unconfirmed and left out.

## Auth

`client-credentials` (custom): the organization API key (`client_id` of the form
`organization.<uuid>`, plus `client_secret`), exchanged at `identity.bitwarden.{com,eu}/connect/token`
with `grant_type=client_credentials&scope=api.organization`. Only an organization **owner** can see
the key (Admin Console, Settings, Organization info, API key). A personal key (`user.<uuid>`) is a
different credential and is refused with an explanation.

The connection stores the key and mints tokens through `refresh` (they last 3600 s). The region is a
two-value select (`us`, `eu`) mapped to a fixed table of host pairs; anything else is rejected, never
interpolated into a URL. Credentials appear only in `auth/` (`sign` stamps the bearer header).

## Hosts (`network.allow`)

`api.bitwarden.com`, `identity.bitwarden.com`, `api.bitwarden.eu`, `identity.bitwarden.eu`.

## Actions

| Resource | Actions |
|---|---|
| collection | `collection-list`, `collection-get`, `collection-update`, `collection-delete` |
| event | `event-list` (date range, filters, `continuationToken`, `maxPages`) |
| group | `group-list`, `group-get`, `group-create`, `group-update`, `group-delete`, `group-member-ids-get`, `group-member-ids-set` |
| member | `member-list`, `member-get`, `member-create`, `member-update`, `member-remove`, `member-group-ids-get`, `member-group-ids-set`, `member-reinvite`, `member-revoke`, `member-restore` |
| subscription | `subscription-get`, `subscription-update` |
| organization | `organization-import` |
| policy | `policy-list`, `policy-get`, `policy-update` |

Integer enums are returned bare by Bitwarden, so member and policy results add `typeName` and
`statusName`.

## Findings that would cost a day

1. **The token endpoint answers 400, not 401, for a bad key**: `400 {"error":"invalid_client"}` on
   both regions (probed live). The auth hook classifies from the body's `error` code. A missing bearer
   on the API itself is a 401 with an empty body.
2. **The prose guide and the OpenAPI document disagree about pagination.** The guide says
   `continuationToken` is present on collections, events, groups, members and policies; the document
   gives it to **events only**. The other four lists have no pagination parameter, so they are
   implemented as a single request.
3. **There is no collection create, and every update is a PUT.** The spec has no `POST /collections`,
   no PATCH anywhere, and does not say whether omitted `collections`/`groups` on a member, group or
   collection PUT are kept or cleared. The action descriptions tell callers to send the full set.
   Success responses for DELETE and the `group-ids`/`member-ids` PUTs are an **empty 200**, and 404 is
   also an empty body, so "wrong id", "other organization" and "deleted" are indistinguishable.
4. Role `type` is 0 Owner, 1 Admin, 2 User, **4** Custom (there is no 3). A member's `id` is
   organization-scoped; `userId` is account-wide, and `actingUserId` in events uses the latter.

## Health checks

- `service` is a **declared absence** (`severity: informational`). `status.bitwarden.com` is a real
  Hund-hosted page with "US RESTful API", "US Identity Service", "EU RESTful API" and "EU Identity
  Service" components, so it does cover the API, but nothing on it is machine-readable. Verified
  2026-10-05: `/api/v2/summary.json`, `/api/v2/status.json`, `/index.json` answer an HTML 404;
  `/history.atom`, `/history.rss`, `/history.json` answer 406; `/api/v1/components.json` answers 401
  (`not_authenticated`, Hund wants the page owner's API key). Scraping the HTML tiles would be
  inferring a state.
- `auth:client-credentials` is derived from the auth `test` hook, which calls `GET /public/policies`:
  a short bounded list that needs nothing beyond the organization key and whose body holds no
  credential.

## Icon

`assets/icon.svg` is Bitwarden's own mark, the `<path>` taken verbatim from simple-icons
(`https://cdn.jsdelivr.net/npm/simple-icons/icons/bitwarden.svg`, 712 bytes) and wrapped in the pack's
100x100 tile like its siblings. `assets/icon.dark.svg` is the reversed (white) variant generated by
`deno task icons:fix`, because the mark is single-colour black. Run `deno task fmt`, never bare
`deno fmt`.

## Layout

```
bitwarden/
├── index.ts                      # AppDefinition: 28 actions, 1 auth, 1 health check
├── lib/client.ts                 # regions, request/error taxonomy, id and enum validation
├── lib/shape.ts                  # enum names added to member/policy/group/collection results
├── auth/client-credentials.ts    # token mint (form-encoded), refresh, sign, test
├── actions/                      # one file per action
├── health/service.ts             # declared absence
└── tests/                        # one test file per action, plus index, auth, lib, health
```
