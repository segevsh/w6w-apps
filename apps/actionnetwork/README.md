# Action Network

Action Network (OSDI / HAL+JSON API v2): people, tags, petitions, events, forms, fundraising pages,
advocacy campaigns, event campaigns, mass messages, and the signatures, RSVPs, submissions,
donations and outreaches recorded against them. v1 is deprecated and not used.

- **Id:** `io.w6w.actionnetwork` · **Categories:** `crm`, `marketing`
- **Auth:** one method, `api-key`: the key travels in the `OSDI-API-Token` header and is stamped only
  by the Auth `sign` hook. Generate it at actionnetwork.org, Start Organizing, API & Sync. Keys belong
  to one list: a group you administer (needed for tags and most organizing data) or your personal list.
- **Egress:** `actionnetwork.org` only.
- **Docs:** https://actionnetwork.org/docs/

## Actions (70)

| Key | Title | Type |
| --- | --- | --- |
| `person-get` | Get Person | read |
| `person-list` | List People | search |
| `person-signup` | Create or Update Person | perform |
| `person-update` | Update Person | perform |
| `tag-create` | Create Tag | perform |
| `tag-get` | Get Tag | read |
| `tag-list` | List Tags | search |
| `tagging-create` | Tag Person | perform |
| `tagging-delete` | Remove Tag From Person | perform |
| `tagging-get` | Get Tagging | read |
| `tagging-list` | List Taggings | search |
| `petition-create` | Create Petition | perform |
| `petition-get` | Get Petition | read |
| `petition-list` | List Petitions | search |
| `petition-update` | Update Petition | perform |
| `signature-get` | Get Signature | read |
| `signature-list` | List Signatures | search |
| `signature-record` | Record Signature | perform |
| `signature-update` | Update Signature | perform |
| `event-create` | Create Event | perform |
| `event-get` | Get Event | read |
| `event-list` | List Events | search |
| `event-update` | Update Event | perform |
| `attendance-get` | Get Attendance | read |
| `attendance-list` | List Attendances | search |
| `attendance-record` | Record RSVP | perform |
| `attendance-update` | Update RSVP Status | perform |
| `form-create` | Create Form | perform |
| `form-get` | Get Form | read |
| `form-list` | List Forms | search |
| `form-update` | Update Form | perform |
| `submission-get` | Get Submission | read |
| `submission-list` | List Submissions | search |
| `submission-record` | Record Form Submission | perform |
| `fundraising-page-create` | Create Fundraising Page | perform |
| `fundraising-page-get` | Get Fundraising Page | read |
| `fundraising-page-list` | List Fundraising Pages | search |
| `fundraising-page-update` | Update Fundraising Page | perform |
| `donation-get` | Get Donation | read |
| `donation-list` | List Donations | search |
| `donation-record` | Record Donation | perform |
| `advocacy-campaign-create` | Create Advocacy Campaign | perform |
| `advocacy-campaign-get` | Get Advocacy Campaign | read |
| `advocacy-campaign-list` | List Advocacy Campaigns | search |
| `advocacy-campaign-update` | Update Advocacy Campaign | perform |
| `outreach-get` | Get Outreach | read |
| `outreach-list` | List Outreaches | search |
| `outreach-record` | Record Outreach | perform |
| `event-campaign-create` | Create Event Campaign | perform |
| `event-campaign-event-create` | Create Event in Event Campaign | perform |
| `event-campaign-get` | Get Event Campaign | read |
| `event-campaign-list` | List Event Campaigns | search |
| `event-campaign-update` | Update Event Campaign | perform |
| `campaign-get` | Get Campaign | read |
| `campaign-list` | List Campaigns | search |
| `list-get` | Get List | read |
| `list-list` | List Lists | search |
| `query-get` | Get Query | read |
| `query-list` | List Queries | search |
| `wrapper-get` | Get Wrapper | read |
| `wrapper-list` | List Wrappers | search |
| `message-cancel-schedule` | Cancel Message Schedule | perform |
| `message-create` | Create Message | perform |
| `message-get` | Get Message | read |
| `message-list` | List Messages | search |
| `message-schedule` | Schedule Message | perform |
| `message-send` | Send Message | perform |
| `message-stop-send` | Stop Message Send | perform |
| `message-update` | Update Message | perform |
| `embed-get` | Get Embed Code | read |

Record helpers (`*-record`, `person-signup`) create or update the person AND record the action in one
call, and accept `addTags` / `removeTags` by tag NAME. Records can be scoped by their parent action or
by `personId` (give exactly one). Pass `backgroundRequest` to have the vendor queue the work and
answer `{}` at once.

## Health checks

| Key | Kind | Notes |
| --- | --- | --- |
| `service` | service | Unavailable, informational: Action Network publishes no status page or feed. |
| `api` | dependency | Unsigned `GET /api/v2/` (the public API entry point); 200 naming Action Network and linking `osdi:people` is ok. |
| `quota` | quota | Unavailable, informational: no rate-limit signal is documented or sent. |
| `auth:api-key` | credential | Derived from `Auth.test`: `GET /people?per_page=1`. |

Status page used: none.

## Icon

`assets/icon.png` is the vendor's own 300x300 favicon PNG, saved verbatim from
`https://s40484.pcdn.co/wp-content/uploads/2022/04/cropped-Favicon@2x-300x300.png`. It was preferred
over n8n's SVG, which is a different mark.

## Left out

Surveys and responses, unique id lists, list items, custom-field metadata, people-scoped route
variants beyond signatures, attendances and donations, outreach update, the unauthenticated public
POST helpers, and webhooks. No person delete exists in the API; DELETE is only offered for taggings and
for cancelling or stopping a message.

## Vendor findings

- A rejected key answers `{"error":"API Key invalid or not present <the key you sent>"}`: the vendor
  echoes the credential back. This app cuts everything after the phrase in every error and test message.
- The public API entry point (`GET /api/v2/`) answers 200 for ANY key, so it proves nothing about a
  credential; the auth probe is `GET /people?per_page=1`, because `/tags` refuses a personal key.
- People cannot be POSTed to directly: use the signup helper. Most resources refuse PUT/DELETE, and a
  message may be created only once per 30 seconds. The docs say `reply-to` but the API takes `reply_to`.
- Referenced tag names that do not exist are silently ignored; `country` defaults to US as soon as any
  other address part is sent.
