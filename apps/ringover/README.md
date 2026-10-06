# Ringover

Query calls, contacts, users, groups, numbers, SMS conversations and tags, place callbacks and send
SMS in **Ringover**, the cloud telephony platform, over the **Ringover public API (v2)**.

- **Categories** — communication, crm
- **Auth methods** — api-key (`Authorization: <key>`, bare, plus a Europe/US region field)
- **Actions** — 30
- **Health checks** — `service` (declared unavailable, informational), `api` (unsigned
  reachability on the connection's region host), `quota` (declared unavailable, informational)
  + the derived `auth:api-key`
- **Egress allowlist** — `public-api.ringover.com`, `public-api-us.ringover.com`
- **API docs** — https://developer.ringover.com (OpenAPI: `/web/openapi_public.yml`)
- **Icon** — the vendor's `apple-touch-icon.png` from `webcdn.ringover.com/app/img/favicon/`
  (180x180, the largest sibling of the favicon its developer portal links), verbatim

Verified on 2026-10-06 against the OpenAPI 3.1.1 document and unauthenticated probes of both
hosts. v2 is the live version. The only deprecated items are `POST /users` (use
`/users/invite`), the `ascending_order` call parameter, the contacts `pagination` /
`alphabetical_order` parameters and the public CDN links in webhook payloads; none is used here.

## Actions

| Area | Actions |
|---|---|
| Team | `team-get` |
| Users | `user-list`, `user-get`, `user-presence-get` |
| Groups | `group-list`, `group-get` |
| Numbers | `number-list`, `number-get` |
| Calls | `call-list`, `call-search`, `call-get`, `call-live-list`, `callback-create`, `transcription-get` |
| Contacts | `contact-list`, `contact-create`, `contact-get`, `contact-update`, `contact-delete`, `contact-number-add`, `contact-number-delete` |
| SMS | `sms-send`, `sms-opt-out`, `sms-opt-in` |
| Conversations | `conversation-list`, `conversation-get`, `message-list` |
| Tags / blacklist | `tag-list`, `tag-create`, `blacklist-list` |

## Things most likely to go wrong

1. **The key is sent bare.** `Authorization: <key>`; a `Bearer ` prefix is answered
   `{"error":"Missing API key"}`. A wrong key is `{"error":"Invalid user"}` (both 401).
2. **Two regions, no discovery.** `public-api.ringover.com` (Europe) and
   `public-api-us.ringover.com` (US) share one contract; the connection asks for the region and
   `afterConnect` records it so every action and health check uses the right host.
3. **401 also means "not permitted".** Each key carries Read/Write grants per category (Calls,
   Contacts, Users, Numbers, IVRs, Conversations, ...) and a **Monitoring** switch: off, a route
   returns only the key owner's own data (`GET /users` returns one user); on, the whole team's.
   Several routes (call recordings, team blacklist, conferences) require Monitoring and answer 401
   without it. Create keys with the grants the workflow needs. `GET /teams` needs none, which is why
   it is the credential probe (it returns the team, never the key).
4. **Empty lists are an empty 204.** Many list routes answer 204 with no body when nothing
   matches; the actions return an empty list with zero counts instead of failing.
5. **Numbers are integers without the `+`.** `33612345678`. The actions accept `+33 6 12 34 56 78`
   and normalise it (`sms-send` and the opt-in/out routes take the number as text, as documented).
6. **Contact updates are all-or-nothing.** `PUT /contacts/{id}` requires first name, last name,
   company and the shared flag every time, and a `numbers` array REPLACES the existing numbers.
7. **Paging.** Most lists use `limit_count` / `limit_offset`; call lists also accept a
   `last_id_returned` cursor (older than that `cdr_id`) — each page returns it as `lastId`.
   `limit_offset` on calls is capped at 9000, so use the cursor for deep history.
8. **Rate limit: 2 requests per second per key** (429). There are no rate-limit headers, hence no
   quota reading.

## Not covered (documented, left out)

Left out to keep the surface focused; all are in the spec: call archiving and recording download
(`GET/DELETE /calls/{id}/channels/{id}`: the success response is documented only as "recording
retrieved", with no schema, so it was not built blind), live-call controls (mute, hold, record,
hangup, transfer, DTMF), call surveys, IVRs and scenarios, conferences, outbound call campaigns
(~30 routes), tasks, user create/invite/delete/plannings/snooze, group membership,
profiles, number reassignment, team and per-user blacklist writes, webhooks (list, create, delete,
events), WhatsApp, conversation archive/rename/purpose, Empower (AI call analytics), CDN download,
the MCP endpoint and SCIM 2.0 provisioning.

## Health checks

- `service` — **declared unavailable.** `status.ringover.com` redirects every path
  (`/api/v2/summary.json`, `/index.json`, `/history.atom`, `/`) to `ringover.com/status`, a ~1 MB
  marketing HTML page that answers 200 with the same shell for all of them: not a Statuspage,
  Instatus or Better Stack page, and no feed. Severity `informational`.
- `api` — unsigned `GET /teams` on the connection's region host. The healthy answer is the
  documented JSON 401 `{"error": "..."}`; an unknown path is a plain-text `404 page not found`, so
  an HTML or text answer is never taken for the API. 5xx or no answer is `down`.
- `quota` — **declared unavailable** (2 requests/second per key, 429 on breach, no headers or
  usage endpoint). Severity `informational`.
- `auth:api-key` — derived from the auth `test` hook (`GET /teams`, verdict read from the body).
