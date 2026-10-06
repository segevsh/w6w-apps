# Pylon

Read and manage issues, messages, accounts, contacts, users, teams and tags in **Pylon**, the B2B
support platform, over the **Pylon API**.

- **Categories** — support, crm
- **Auth methods** — api-token (`Authorization: Bearer <token>`, plus a US/EU region field)
- **Actions** — 30
- **Health checks** — `service` (status.usepylon.com, `API` component), `api` (unsigned
  reachability on the connection's region host), `quota` (declared unavailable, informational)
  + the derived `auth:api-token`
- **Egress allowlist** — `api.usepylon.com`, `api.eu.usepylon.com` (the status check declares
  `status.usepylon.com` itself)
- **API docs** — https://docs.usepylon.com/pylon-docs/developer/api
- **Icon** — the vendor's favicon from usepylon.com, embedded verbatim (32x32 PNG, plus the
  vendor's dark variant)

Verified on 2026-10-06 against the Pylon API reference and live probes of both API hosts. No
deprecation wording was found for the endpoints used here; the one deprecated field, the account
`domain` property (superseded by `domains`/`primary_domain`), is not exposed.

## Things most likely to go wrong

1. **Two regions, no discovery.** Tenants live on `api.usepylon.com` or `api.eu.usepylon.com`, and
   a token used on the other host is refused with `wrong_region_token`. The connection asks for
   the region and `afterConnect` records it so every action and health check uses the right host.
2. **Errors are classified by `code`, not status or message.** Envelope:
   `{errors:[...], request_id, code}`. A duplicate create also returns `exists_id`, which the
   error text surfaces as `[existing id ...]`.
3. **Listing issues needs a time window.** `GET /issues` requires `startTime` and `endTime`
   (and the window is capped), so it is not a "list everything" call. Use Search Issues for
   filter-based queries.
4. **Rate limits are per endpoint and prose-only** (reads 300/min; updates and searches 120/min;
   creates, `GET /issues` and deletes 30/min). A breach is a 429 with `X-Retry-After`, which the
   error message carries; there are no rate-limit headers, hence no quota reading.
5. **Pagination is cursor-based only on some lists.** Issues, accounts, contacts and messages take
   `cursor`/`limit`; the users, teams, tags and statuses lists document no cursor, so only
   `hasNextPage` is returned.
6. **Account/contact IDs accept external IDs** in the path; they are percent-encoded.
7. **Empty strings are meaningful.** An empty `ownerId`/`accountId` on update clears the field and
   an empty tag list clears tags; unset fields are never sent.

## Actions

| Area     | Actions                                                                                 |
| -------- | --------------------------------------------------------------------------------------- |
| Me       | me-get                                                                                  |
| Issues   | issue-list, issue-get, issue-create, issue-update, issue-search, issue-snooze, issue-thread-list, issue-status-list |
| Messages | message-list, issue-reply, issue-note-create                                            |
| Accounts | account-list, account-get, account-create, account-update, account-search               |
| Contacts | contact-list, contact-get, contact-create, contact-update, contact-search               |
| Users    | user-list, user-get, user-search                                                        |
| Teams    | team-list, team-get                                                                     |
| Tags     | tag-list, tag-create, tag-update                                                        |

## Not covered

Deletes (issue, account, contact, tag), account merge, relationships and notebook notes, issue
groups, AI response, followers, external-issue link, voice calls, redact/delete message, draft
reply, custom fields and custom objects, email, knowledge base, macros, tasks and projects, ticket
forms, training data, surveys, feature requests, call recordings, attachments, audit logs, user
roles, user update, team create/update, and the activities, files and highlights endpoints.
