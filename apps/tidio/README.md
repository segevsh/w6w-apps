# Tidio

Drive **Tidio** from a workflow: contacts and their custom properties, conversations, tickets,
operators, departments and the Lyro AI Agent's Q&A knowledge, over the OpenAPI at `api.tidio.com`.

- **Categories** — support, communication
- **Auth methods** — client-credentials (Client ID `ci_...` + Client Secret `cs_...`, two secret fields)
- **Actions** — 24
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:client-credentials`
- **Egress allowlist** — `api.tidio.com` (the `service` check adds `status.tidio.com` to its own hook
  allowlist, never to the app's)
- **API docs** — https://developers.tidio.com/llms.txt (each reference page's `.md` embeds its OpenAPI)
- **Status page** — https://status.tidio.com/

> Everything here was read on 2026-10-06 from Tidio's own reference and guides. Unsigned and
> bogus-credential probes of `api.tidio.com` were made live; no real credential was available, so
> authenticated response shapes are the documented ones, not observed ones.

## Connecting

In Tidio Panel go to **Developer > OpenAPI** and generate an API key (project owner or admin only).
You get a Client ID (`ci_...`) and Client Secret (`cs_...`); paste both. They are sent as the
`X-Tidio-Openapi-Client-Id` / `X-Tidio-Openapi-Client-Secret` headers by the auth `sign` hook only.

**Plan requirement.** OpenAPI is available on **Plus and Premium** only (Tidio Free has none; a
project without access gets `403 api_access_disabled`). The Products endpoints need a paid Lyro plan
and are not part of this app.

The connection test calls `GET /project` (returns `{project_id, status}`, never the credential). It
passes only on a 200 carrying a numeric `project_id`; a rejection is read from the vendor's error code
(`unauthorized`, `api_access_disabled`), not the HTTP status.

## Things most likely to go wrong

1. **A version header is mandatory** (`Accept: application/json; version=1`); the client sends it on
   every call. Without it Tidio answers `406 missing_api_version`.
2. **Cursor pagination.** List actions return `{items, count, hasMore, nextCursor, limit}`. Pass
   `nextCursor` back as `cursor`; `null` means the last page.
3. **Rate limits are per project per minute**: 60 on Plus, 120 on Premium. `429 too_many_requests` is
   surfaced as an error. The `quota` check reads the documented `x-ratelimit-limit` /
   `x-ratelimit-remaining` headers off `GET /project`; those headers were not observed on a signed
   response, so it is `informational` and reports `unknown` if they are absent.
4. **Writes mostly return no body** (204 for updates and deletes, 202 for Send Message As Contact), so
   those actions return `{updated|deleted: true, id}` or `{status}`.
5. **Batch writes are all-or-nothing** (1-100 contacts): one invalid contact fails the whole call.
6. **Ticket IDs are integers; contact, operator, department and Lyro IDs are UUIDs.**
7. **Update Ticket's `tag_ids` replaces the whole tag set** (empty array clears it); `custom_fields`
   merges, and a `null` value removes a stored value. `Unassign` sends `assigned: null`.
8. **Contacts drop the deprecated `messenger_id` / `instagram_id`** (the reference says they always
   return null).
9. **Contact properties** can be given as `[{name, value}]` or a plain `{name: value}` object.
10. The Ticket list takes no filters; the reference documents only `cursor`.

## Actions

| Group      | Actions |
| ---------- | ------- |
| Project    | `project-get` |
| Contacts   | `contact-list`, `contact-get`, `contact-create`, `contact-update`, `contact-delete`, `contact-batch-create`, `contact-batch-update`, `contact-viewed-pages-list`, `contact-message-list`, `contact-message-send`, `contact-property-list` |
| Team       | `operator-list`, `department-list` |
| Tickets    | `ticket-list`, `ticket-get`, `ticket-create`, `ticket-update`, `ticket-delete`, `ticket-reply`, `ticket-tag-list`, `ticket-custom-field-list` |
| Lyro AI    | `lyro-data-source-list`, `lyro-qa-create` |

## Not covered

- Lyro: Ask Lyro to answer a ticket, upsert website data source, website scraping, update QA data
  source (documented, left out to keep the surface focused).
- Products: Upsert products, Delete product (paid Lyro plan required).
- The separate **Analytics API** (read-only reports) and **Webhooks** (events, signature verification).

## Health checks

- `service` — `status.tidio.com` is a real Atlassian Statuspage (`page.id` `gjgh0hrr6n4h`, name
  "Tidio"); `GET /api/v2/summary.json`. Only the `API` component (`8wy1nxcp6cvz`) drives the verdict;
  Chat widget, Lyro AI, Ticketing System and the rest are reported for visibility. `history.atom`
  404s, so there is no feed.
- `quota` — see item 3 above. `informational`.
- `auth:client-credentials` — derived from the auth `test` hook above.
