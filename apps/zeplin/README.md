# Zeplin

Read and update Zeplin design handoff data from a workflow: projects, screens and their versions
(image, layers, assets), notes and comments, components, colors, text styles, design tokens and
styleguides. API reference: <https://docs.zeplin.dev/llms.txt> (per-operation OpenAPI 3.0.2
fragments; server `https://api.zeplin.dev`, paths under `/v1`).

## Connecting

Create a **personal access token** in the Zeplin web app (Profile > Developer > Personal access
tokens) and paste it into the connection. It is sent as `Authorization: Bearer <token>` by the
connection's `sign` hook; no action ever sees it. The connection test calls `GET /v1/users/me`,
which needs a valid token and returns the caller's own id, email and username, never the token.
The OAuth authorization-code flow is **not modelled**: it needs a registered Zeplin app with its own
client id and secret.

The API allows **200 requests per minute per user** (a 429 `Rate limit exceeded`); the limit is
shared by every token and app acting for that user.

## Actions

List endpoints answer a bare JSON array and page with `limit` (1-100, default 30) and `offset`. Each
list action returns `{ items, count, limit, offset, next_offset }`; `next_offset` is the offset for
the next call and is `null` on a short (last) page, because the vendor gives no total.

| Action | Route | Notes |
| --- | --- | --- |
| Get Current User | `GET /users/me` | |
| List Organizations | `GET /organizations` | |
| List Organization Projects | `GET /organizations/{id}/projects` | |
| List Projects | `GET /projects` | workspace (`personal` or an organization id), status |
| Get Project | `GET /projects/{id}` | |
| Update Project | `PATCH /projects/{id}` | name, description, workflow status, link/unlink styleguide |
| List Project Members | `GET /projects/{id}/members` | |
| List Screens | `GET /projects/{id}/screens` | section filter, sort |
| Get Screen | `GET /projects/{id}/screens/{screen}` | |
| Update Screen | `PATCH /projects/{id}/screens/{screen}` | description, tags |
| List Screen Versions | `GET .../screens/{screen}/versions` | |
| Get Latest Screen Version | `GET .../screens/{screen}/versions/latest` | image, layers, assets |
| List Screen Sections | `GET /projects/{id}/screen_sections` | |
| List Screen Notes | `GET .../screens/{screen}/notes` | |
| Create Screen Note | `POST .../screens/{screen}/notes` | point or area note, position normalised 0-1 |
| Update Screen Note | `PATCH .../notes/{note}` | resolve/reopen, recolor, move |
| Delete Screen Note | `DELETE .../notes/{note}` | |
| Create Screen Comment | `POST .../notes/{note}/comments` | reply to a note |
| List Project Components | `GET /projects/{id}/components` | section, sort, latest version |
| Get Project Component | `GET /projects/{id}/components/{component}` | |
| List Project Colors | `GET /projects/{id}/colors` | |
| Create Project Color | `POST /projects/{id}/colors` | name, r/g/b 0-255, alpha 0-1 |
| List Project Text Styles | `GET /projects/{id}/text_styles` | |
| Get Project Design Tokens | `GET /projects/{id}/design_tokens` | colors, spacing, text styles; token name case |
| List Styleguides | `GET /styleguides` | workspace, status, linked project/styleguide |
| Get Styleguide | `GET /styleguides/{id}` | |
| List Styleguide Colors | `GET /styleguides/{id}/colors` | |
| List Styleguide Components | `GET /styleguides/{id}/components` | |

Category: `developer-tools`, `productivity`.

## Health

| Check | What it does |
| --- | --- |
| `service` | Declared unavailable (informational): Zeplin publishes no status page. `status.zeplin.io` is a 302 to the marketing home page, `zeplin.statuspage.io` answers "Your page is inactive", and the docs link none. |
| `api` | Unauthenticated `GET /v1/users/me`. The application's own JSON `{"message":"invalid_token"}` 401 passes; an HTML page or other JSON does not; 5xx is down. |
| `quota` | Signed `GET /v1/users/me`; reads `Zeplin-RateLimit-Limit/Remaining/Reset` (reset in epoch milliseconds). Informational; degraded at zero remaining. |

The derived `auth:personal-access-token` check is the credential probe.

## Not covered

Left out to keep the surface at 28 actions; every one is a documented endpoint that can be added the
same way:

- Webhooks (organization, project, styleguide and user: list/create/get/update/delete) and the webhook
  event models. A workflow trigger would need a subscription lifecycle this app does not implement.
- Organization admin routes: get one organization, billing, workflow statuses, aliens, members, invite,
  update and remove member; project and styleguide invite/remove member; and `GET`/`PATCH` of a
  member's projects and styleguides. Admin writes are refused for OAuth apps and need an admin token.
- Screen annotations (list/get/create/update/delete, annotation note types), single note and
  comment update/delete, create a screen, create a screen version, single section/variant reads.
- Styleguide text styles, spacing tokens, design tokens, variable collections, pages, component
  sections, connected components and flow boards; project and styleguide spacing/text-style/color
  updates (only Create Project Color is modelled); project component update and latest-version reads.
- User notifications (list/get/update/bulk update) and the OAuth endpoints.

No deprecation, sunset or end-of-life notice appears in the API reference index or in any page read
(`grep -iE "deprecat|sunset|will be removed|end of life"` over the index and every fetched page: no
hits); `/v1` is the only version.

## Icon

`assets/icon.png` is the vendor's `apple-touch-icon.png` (180x180), saved verbatim from
`https://zeplin.io/static/apple-touch-icon.png` (the `<link rel="apple-touch-icon">` on zeplin.io).
