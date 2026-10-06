# Autotask PSA

Query, read and write the records of a Datto/Kaseya **Autotask PSA** tenant (tickets, companies,
contacts, time entries, projects, tasks, opportunities) on the **Autotask REST API v1.0**.

- **Categories** — support, crm, project-management
- **Auth methods** — `api-user` (custom: username + secret + integration code + zone)
- **Actions** — 21 (6 reads, 14 writes, 1 delete)
- **Health checks** — 3 (`service`, `api`, `quota`) + the derived `auth:api-user`
- **Egress allowlist** — `webservices.autotask.net` (zone discovery) and the 20 published zone hosts
  `webservices{1-6,11,12,14-19,22,24,25,26,28,29}.autotask.net`
- **API docs** — https://autotask.net/help/DeveloperHelp/Content/APIs/REST/REST_API_Home.htm
- **Status page** — https://status.kaseya.com/

## Setup

1. In Autotask create a resource with the security level **API User (API-only)**.
2. On that user's Security tab pick an **Integration Vendor** (tracking identifier) and copy the
   **Tracking Identifier** -- that is the *integration code*.
3. Connect in w6w with the username, secret, integration code and **your zone** (the number in
   `webservicesN.autotask.net`). Connecting with the wrong zone is caught by `test`, which asks the
   vendor's discovery endpoint and names the right zone.

## Can the zone hosts be declared in `network.allow`?

Yes. The zone set is finite and published, so every host is listed in `package.json` (20 zones plus
the discovery host) and the app reaches nothing else. If Datto adds a zone the app needs a release.

## Coverage

- **Reads** — `entity-query` (any of 176 queryable entities, filter + paging), `entity-count`,
  `entity-get`, `entity-fields` (required fields and picklists), `ticket-note-list`, `threshold-info`.
- **Writes** — create and update for tickets, ticket notes, companies, contacts, time entries
  (create + delete), projects, project tasks and opportunities. Updates use PATCH (PUT would blank
  every field you omit). Every write takes a free-form `fields` JSON for anything not typed.
- **Deliberately absent** — webhook entities, attachments, client-portal users and integration
  vendor entities (they carry secrets or need a different transport); batch/bulk writes; deletes
  beyond time entries; the SOAP API.

## Vendor findings that cost a day

1. **Missing id is HTTP 200.** `GET /Tickets/{id}` returns `{"item": null}` for an id that does not
   exist, so `entity-get` reports `found: false` rather than throwing.
2. **Errors are 500, not 4xx.** A bad request (missing field, unknown zone user) comes back as
   `500 {"errors": [...]}`. The client throws the `errors` text, and even a 200 carrying `errors`.
3. **The zone is not in the credential.** A wrong zone answers 401 with no body. Discovery
   (`zoneInformation?user=`) needs no auth and is the only way to confirm it. The status page lists
   regions, not zone numbers, so the `service` check is deliberately conservative.
4. Contacts and project tasks can only be created under their parent path
   (`/Companies/{id}/Contacts`, `/Projects/{id}/Tasks`); ticket notes under `/Tickets/{id}/Notes`.
5. Query without a filter is refused; `entity-query` sends a match-all `id >= 0` filter instead.

## Icon

`assets/icon.svg` is Datto's badge (`badge-datto.svg` from datto.com).

## Tests

`deno task test` -- unit tests with a mocked HookContext for the entry module, client, auth, the
three health checks and every action.
