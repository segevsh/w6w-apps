# Cloze

Drive the [Cloze](https://www.cloze.com) relationship CRM from a workflow: people, companies and
projects, timelines, to-dos and notes, account metadata and webhooks.

- **App id:** `io.w6w.cloze` · **Category:** `crm` · **Host:** `api.cloze.com`
- **Auth:** `api-key` (a Cloze API key, sent as `Authorization: Bearer <key>`). Create one in Cloze
  under Settings > Integrations > Cloze API. OAuth2 is offered by Cloze but is not part of v1.
- Every path, parameter and body field was read from Cloze's OpenAPI document
  (`developer.cloze.com/cloze-openapi.json`, version 2026.9) on 2026-10-06.

## Actions (41)

| Key | Type | What it does |
|---|---|---|
| `communication-create` | perform | Record an e-mail, call, text, meeting or message on the Cloze timeline. |
| `company-create` | perform | Create a company, or enhance the existing one when an ID or e-mail matches. Cloze returns no record body. |
| `company-delete` | perform | Delete a company. This cannot be undone. |
| `company-feed` | read | Page through changes to your companies with a cursor. Pass the previous result's cursor to continue. |
| `company-find` | search | Search your companies with Cloze's query syntax or structured filters, one page at a time. |
| `company-get-many` | read | Fetch several companies by ID in one call. |
| `company-get` | read | Fetch one company by Cloze ID, unique ID or (for people) e-mail address. |
| `company-timeline` | read | List timeline entry references for a company. Use Get Messages to read their content. |
| `company-update` | perform | Update an existing company (matched by Cloze ID, unique ID or e-mail); only the fields you set change. Cloze returns no record body. |
| `content-create` | perform | Add a note, event, to-do or file record to the Cloze timeline, linked to records. |
| `custom-fields-list` | read | List the custom fields defined in your account, with their ids and allowed values. |
| `message-body-get` | read | Fetch the full body of one message by its key. |
| `messages-get` | read | Read the content of timeline messages, from the references a timeline call returns. |
| `person-create` | perform | Create a person, or enhance the existing one when an ID or e-mail matches. Cloze returns no record body. |
| `person-delete` | perform | Delete a person. This cannot be undone. |
| `person-feed` | read | Page through changes to your people with a cursor. Pass the previous result's cursor to continue. |
| `person-find` | search | Search your people with Cloze's query syntax or structured filters, one page at a time. |
| `person-get-many` | read | Fetch several people by ID in one call. |
| `person-get` | read | Fetch one person by Cloze ID, unique ID or (for people) e-mail address. |
| `person-timeline` | read | List timeline entry references for a person. Use Get Messages to read their content. |
| `person-update` | perform | Update an existing person (matched by Cloze ID, unique ID or e-mail); only the fields you set change. Cloze returns no record body. |
| `project-create` | perform | Create a project, or enhance the existing one when an ID or e-mail matches. Cloze returns no record body. |
| `project-delete` | perform | Delete a project. This cannot be undone. |
| `project-feed` | read | Page through changes to your projects with a cursor. Pass the previous result's cursor to continue. |
| `project-find` | search | Search your projects with Cloze's query syntax or structured filters, one page at a time. |
| `project-get-many` | read | Fetch several projects by ID in one call. |
| `project-get` | read | Fetch one project by Cloze ID, unique ID or (for people) e-mail address. |
| `project-timeline` | read | List timeline entry references for a project. Use Get Messages to read their content. |
| `project-update` | perform | Update an existing project (matched by Cloze ID, unique ID or e-mail); only the fields you set change. Cloze returns no record body. |
| `segments-list` | read | List the segments configured for your people or your projects. |
| `stages-list` | read | List the stages configured for your people or your projects. |
| `steps-list` | read | List the Next Steps, grouped by segment and stage. |
| `tags-list` | read | List the tags in use, with how many records carry each. |
| `team-members-list` | read | List the members of your Cloze team (name and e-mail). |
| `team-nodes-list` | read | List the subteam nodes of your hierarchy. |
| `team-roles-list` | read | List the roles available on your Cloze team. |
| `todo-create` | perform | Add a to-do (with an optional reminder) to Cloze, linked to people, companies or projects. |
| `user-profile-get` | read | Fetch the profile of the Cloze user the API key belongs to. |
| `webhook-list` | read | List your webhook subscriptions. |
| `webhook-subscribe` | perform | Subscribe a URL to person, project or company change events. |
| `webhook-unsubscribe` | perform | Cancel a webhook subscription by its ID or reference name. |

## Notes

- Cloze answers `{errorcode, message}`; `errorcode: 0` is success. A non-zero code fails the action
  even on HTTP 200. The `errorcode` field is stripped from outputs.
- Create and update return **no record**, only a message. They are upserts: an existing record is
  matched by `syncKey`, a unique ID or (people) an e-mail address and enhanced, which is why they
  are marked idempotent. To-do, communication, note and webhook-subscribe actions are not.
- List-shaped params (`uniqueids`, `keywords`, `domains`, `projectTeam`) take comma-separated text or
  a JSON array; nested objects (`emails`, `phones`, `customFields`, ...) take JSON.
- A timeline is two calls: `*-timeline` returns `{key, changed}` references, `messages-get` reads
  them. The document marks `uniqueid` as required in the timeline body but only defines `id`, so
  `id` is what is sent.
- Feeds are cursored: pass the previous `cursor`; filters apply to the first call only.

## Health

- `service`: declared unavailable (informational). Cloze publishes no status page: `status.cloze.com`
  does not resolve and the docs link none.
- `api`: unsigned `GET /v1/user/stages/people`; a JSON 401 carrying Cloze's `message` proves the
  gateway is serving. HTML or an unknown body is `unknown`, 5xx is `down`.
- `quota`: declared unavailable (informational). No rate limit, header or usage endpoint documented.
- Derived `auth:api-key`: the same stage-list probe, signed. It reads stage labels only, never the
  profile. A pass needs a `list` array; a rejection is recognised from Cloze's message
  ("The API key was not found" or "Invalid token"), never from the status.

## Not covered

Analytics (`/v1/analytics/*`), team member update (`/v1/team/members/update`), form submission
(`/v1/people/submit`), similar projects (`/v1/projects/similar`), message opens
(`/v1/messages/opens`), views and recipient lists (`/v1/user/views`, `/v1/user/recipients`) and
OAuth2.

## Development

```
deno task validate && deno task check && deno task lint && deno task fmt && deno task test
```
