# Mural

Drive [Mural](https://www.mural.co)'s public REST API (`https://app.mural.co/api/public/v1`) from a
w6w workflow: workspaces, rooms, murals, widgets (sticky notes, text boxes, comments) and tags.
30 actions.

Every endpoint, parameter and body field was read on 2026-10-06 from Mural's own reference at
`developers.mural.co/public/reference/` (the OpenAPI 3.1 document embedded in each page).

## Auth

OAuth 2.0 authorization code only (`oauth2`): the API declares no API key. Register an app at
<https://app.mural.co/developers/apps>, enter its client ID and secret when connecting. Authorize
`https://app.mural.co/api/public/v1/authorization/oauth2`; token and refresh both use
`.../authorization/oauth2/token`. Tokens expire (`TOKEN_EXPIRED`), so the host's refresh is needed.
Scopes requested: `identity:read workspaces:read rooms:read rooms:write murals:read murals:write
users:read`. PKCE is not documented and is not requested.

## Actions

| Area | Actions |
|---|---|
| User | `current-user-get` |
| Workspaces | `workspace-list`, `workspace-get` |
| Rooms | `room-list`, `room-get`, `room-create`, `room-update`, `room-delete`, `room-search`, `room-member-list`, `room-folder-list` |
| Murals | `mural-list`, `mural-recent-list`, `room-mural-list`, `mural-get`, `mural-create`, `mural-update`, `mural-delete`, `mural-duplicate`, `mural-search`, `mural-user-list` |
| Widgets | `widget-list`, `widget-get`, `widget-delete`, `sticky-note-create`, `sticky-note-update`, `textbox-create`, `comment-create` |
| Tags | `tag-list`, `tag-create` |

Responses are unwrapped from Mural's `{ value }` envelope. Lists return `{ items, next }`; pass
`next` back as the `next` input for the following page (tokens expire; the vendor rejects `limit`
of 100 or more). Delete actions return `{ deleted: true, id }`. Widget creates take and return
arrays in the API; these actions send one widget and return it. Room IDs are integers, mural and
workspace IDs are strings. `style` and `tags` are JSON inputs.

## Not covered

Left out rather than guessed at (endpoints exist in the reference, not implemented here): voting
sessions, timers, private mode, templates (list/create/search), exports (`exporturlmural`, export
creation), mural/room membership management and invites, visitor settings and link reset, access
requests, mural-from-template, room folder create/delete, tag get/update/delete, and the widget
types area, arrow, file, image, shape, table, title (create/update) plus update for text box,
comment, area, arrow, file, image and shape; assets.

## Health checks

- `service`: Atlassian Statuspage at `status.mural.co` (`page.id` `dbk70dpy3n7h`, name "Mural",
  verified real). Mural lists no "API" component, so eight components an API call depends on are
  pinned by id (Authentication, Integrations, Mural Database, Canvas, Realtime collaboration,
  Search, Dashboard, Exports); Billing, Notifications, Learning and Website do not count.
- Credential probe: `GET /users/me` (the caller's profile, never the token), classified from the
  body's `code` (`UNAUTHORIZED` / `TOKEN_EXPIRED` mean rejected).
- `quota`: declared unavailable, informational. The API definition documents no rate-limit headers,
  429 or usage endpoint.
