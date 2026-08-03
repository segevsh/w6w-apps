# Google Contacts

Read and manage a Google account's contacts and contact groups.

- **Categories** — crm, productivity
- **Auth methods** — oauth2
- **Actions** — 14
- **Egress allowlist** — `people.googleapis.com`, `www.googleapis.com`
- **Website** — https://contacts.google.com
- **API docs** — https://developers.google.com/people/api/rest

## This is the People API, not Contacts API v3

The old **Google Contacts API v3** (`https://www.google.com/m8/feeds/...`, scope
`https://www.google.com/m8/feeds`) is **dead**, and any integration still pointing at it is broken
rather than deprecated. Google's own migration guide states plainly: _"The Contacts API was turned
down on January 19, 2022."_

Its replacement — and everything this app talks to — is the **Google People API**:

```
https://people.googleapis.com/v1
```

The two are not shaped alike. v3 was GData/Atom feeds; the People API is JSON with resource names
(`people/c1234567890`, `contactGroups/myContacts`), custom verbs (`people:createContact`,
`people/{id}:updateContact`), and — the part that trips people up — **mandatory field masks** on
almost every read. See the two sections below.

Migration guide: https://developers.google.com/people/contacts-api-migration

## Field masks are mandatory, and the parameter is not always called the same thing

Every read in the People API returns _nothing_ unless you name the fields you want, and the
parameter's name changes between methods. This is the single easiest thing to get silently wrong, so
the client centralises it in `lib/client.ts` and every action that needs a mask ships a working
default.

| Action                                     | Parameter                             | Required by Google?                 |
| ------------------------------------------ | ------------------------------------- | ----------------------------------- |
| `list-connections`                         | `personFields`                        | **Yes**                             |
| `get-person`                               | `personFields`                        | **Yes**                             |
| `batch-get-people`                         | `personFields`                        | **Yes**                             |
| `create-contact`                           | `personFields`                        | **Yes** (yes, on a POST)            |
| `search-contacts`                          | `readMask`                            | **Yes** — _not_ `personFields`      |
| `list-other-contacts`                      | `readMask`                            | **Yes**                             |
| `update-contact`                           | `updatePersonFields`                  | **Yes**, and no default is possible |
| `update-contact`                           | `personFields`                        | No — restricts the response echo    |
| `list-contact-groups`, `get-contact-group` | `groupFields`                         | No                                  |
| `create-contact-group`                     | `readGroupFields` (in the **body**)   | No                                  |
| `update-contact-group`                     | `updateGroupFields` (in the **body**) | No — defaults to `name`             |

Three consequences worth internalising:

1. **`updatePersonFields` has no default and this app refuses to invent one.** Google _clears_ any
   field named in the mask but absent from the request body. Guessing the mask would delete contact
   data, so `update-contact` throws if you leave it empty.
2. **Masks are comma-joined into one parameter**, not repeated. `sources[]` and `resourceNames[]`
   _are_ repeated (`?sources=A&sources=B`). The client handles both: array values become repeated
   params, masks are normalised, de-duplicated and joined.
3. **The writable mask is a subset of the readable one.** `ageRanges`, `coverPhotos`, `metadata`,
   `photos` and `skills` are read-only, so `update-contact` does not offer them.

## Updates need the etag you read

`people.updateContact` is optimistic-concurrency-checked. Google's docs: _"you must include the
`person.metadata.sources.etag` field in the person for the contact to be updated to make sure the
contact has not changed since your last read."_

So the workflow is always **read, then write**:

1. `get-person` with `personFields` including `metadata` → the response carries `etag`.
2. Modify the Person object.
3. `update-contact` with that object and an explicit `updatePersonFields`.

The app fails fast with a pointed message if the body carries neither `person.etag` nor
`person.metadata.sources[].etag`, rather than letting Google return an opaque 400.

## Actions

| Key                            | Type    | Endpoint                                                 |
| ------------------------------ | ------- | -------------------------------------------------------- |
| `list-connections`             | read    | `GET /v1/{resourceName=people/*}/connections`            |
| `get-person`                   | read    | `GET /v1/{resourceName=people/*}`                        |
| `batch-get-people`             | read    | `GET /v1/people:batchGet` (≤ 200 names)                  |
| `search-contacts`              | search  | `GET /v1/people:searchContacts` (pageSize ≤ 30)          |
| `list-other-contacts`          | read    | `GET /v1/otherContacts`                                  |
| `create-contact`               | perform | `POST /v1/people:createContact`                          |
| `update-contact`               | perform | `PATCH /v1/{person.resourceName=people/*}:updateContact` |
| `delete-contact`               | perform | `DELETE /v1/{resourceName=people/*}:deleteContact`       |
| `list-contact-groups`          | read    | `GET /v1/contactGroups`                                  |
| `get-contact-group`            | read    | `GET /v1/{resourceName=contactGroups/*}`                 |
| `create-contact-group`         | perform | `POST /v1/contactGroups`                                 |
| `update-contact-group`         | perform | `PUT /v1/{contactGroup.resourceName=contactGroups/*}`    |
| `delete-contact-group`         | perform | `DELETE /v1/{resourceName=contactGroups/*}`              |
| `modify-contact-group-members` | perform | `POST /v1/{resourceName=contactGroups/*}/members:modify` |

Sharp edges the params document inline:

- **`get-contact-group` returns no members by default.** `maxMembers` defaults to `0`.
- **`search-contacts` warms a per-session index.** Google advises a warm-up request with an empty
  query; a first search can legitimately come back empty. The app does not issue that request
  implicitly — a silent extra call is worse than a documented one.
- **`delete-contact-group` can delete people.** `deleteContacts` defaults to off and is only put on
  the wire when explicitly turned on.
- **`modify-contact-group-members` reports partial failure in a 200.** Check `notFoundResourceNames`
  and `canNotRemoveLastContactGroupResourceNames` — Google refuses to strip a contact of its last
  group. Among system groups only `myContacts` and `starred` accept additions.
- **`list-other-contacts` exposes only five fields** (`emailAddresses`, `metadata`, `names`,
  `phoneNumbers`, `photos`) under the default source, and needs its own scope.

Endpoints deliberately **not** implemented: `people:listDirectoryPeople` /
`people:searchDirectoryPeople` (Workspace directory, needs `directory.readonly` — a domain-wide read
no other action here justifies asking for), `people:batchCreateContacts` / `batchUpdateContacts` /
`batchDeleteContacts`, `updateContactPhoto` / `deleteContactPhoto`, and
`otherContacts:copyOtherContactToMyContactsGroup`. They exist and are real; they were scoped out,
not overlooked.

## Auth

**`oauth2` is the only method** — deliberately, and unlike the sibling `google-sheets` /
`google-drive` apps in this pack, which also ship a `service-account` method.

A Drive file or a Sheet can be _shared with_ a service account's email, which makes a plain service
account a first-class principal there. **A contact cannot.** There is no share model for a person's
address book, so a bare service account simply has an empty one and `people/me/connections` would
return nothing. The only route to real contacts is Google Workspace **domain-wide delegation**,
where an admin grants the service account the contacts scope and it impersonates a named domain user
— an admin-provisioned, Workspace-only configuration rather than "a service account". Shipping it as
if it were the Sheets/Drive flow would mislead, so it is left out.

Scopes requested:

| Scope                                                     | Why                                               |
| --------------------------------------------------------- | ------------------------------------------------- |
| `https://www.googleapis.com/auth/contacts`                | Read + write contacts and contact groups          |
| `https://www.googleapis.com/auth/contacts.other.readonly` | `list-other-contacts` — not implied by `contacts` |

`https://www.googleapis.com/auth/contacts.readonly` and
`https://www.googleapis.com/auth/directory.readonly` are real People API scopes but are not
requested: the first is subsumed by `contacts`, and the second buys nothing because no directory
action ships.

Setup: Google Cloud Console → APIs & Services → **enable the People API** → Credentials → OAuth
client ID, then store `client_id` / `client_secret` / `redirect_uri` on the w6w server via
`PUT /apps/:id/oauth-config/oauth2`. `access_type=offline` and `prompt=consent` are set on the
authorize URL, or Google omits `refresh_token` for returning users.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left. Only the second is something
the app itself performs.

### Is the vendor up?

**Nothing to check.** This is the honest answer, and it differs from the other `google-*` apps in
this pack.

Those apps read Google's Workspace Status Dashboard incident feed
(`https://www.google.com/appsstatus/dashboard/incidents.json`) and filter it to their own
`service_name`. That cannot work here. The dashboard's own machine-readable product list —

```
GET https://www.google.com/appsstatus/dashboard/products.json
```

— enumerates 36 products (Gmail, Google Calendar, Google Drive, Google Sheets, Google Docs, Google
Keep, Google Tasks, Google Voice, …) and **Google Contacts is not one of them** (checked
2026-08-02). Filtering the incident feed to "Google Contacts" would match nothing, ever, and report
a permanent, meaningless `ok`.

The plausible substitutes are worse, not better:

- Widening the filter to all of Workspace makes a Google Meet outage fail this app.
- `status.cloud.google.com` covers Google **Cloud Platform** products; the People API is a
  Workspace/Google-account API and is not listed there.
- Probing `people.googleapis.com` unauthenticated proves only that TLS reaches Google's front end,
  which stays up through a backend incident.

So `service` is declared `unavailable` with that reason rather than faked.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself.

| Auth method | Probe                                                               |
| ----------- | ------------------------------------------------------------------- |
| `oauth2`    | `GET https://people.googleapis.com/v1/people/me?personFields=names` |

The narrowest probe the People API offers. `personFields` is **required** on `people.get`, so it is
sent rather than omitted — omitting it is a 400, which would report a live credential as broken.
`names` is the cheapest single mask, and it is covered by the `contacts` scope the connection
already holds, so the check never fails for want of a scope the credential legitimately lacks.

### Do we have quota left?

No headroom endpoint and no rate-limit headers. Quota is per-Cloud-project and set and viewed only
in the Google Cloud console (APIs & Services → People API → Quotas); exhaustion surfaces as 429
`rateLimitExceeded` or 403 `userRateLimitExceeded`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md). The
three questions above map onto declared checks like this:

| Key           | Kind       | Scope      | Credential | Severity      | Probe                                               |
| ------------- | ---------- | ---------- | ---------- | ------------- | --------------------------------------------------- |
| `service`     | service    | app        | none       | informational | _declared absent_                                   |
| `quota`       | quota      | connection | signed     | informational | _declared absent_                                   |
| `auth:oauth2` | credential | connection | signed     | fatal         | derived from the `oauth2` auth method's `test` hook |

**Both `service` and `quota` are declared absent**, and both therefore carry
`severity: "informational"`. A declared absence always reports `unknown`; without the informational
severity that `unknown` would pin every verdict for this app there forever.

Because no check here runs a hook, this app adds **no** status host to any allowlist —
`w6w.network.allow` is exactly the two API hosts the actions and auth hooks call.

## Links

- **Website** — https://contacts.google.com
- **API reference** — https://developers.google.com/people/api/rest
- **Getting started** — https://developers.google.com/people/v1/getting-started
- **Read and manage contacts** — https://developers.google.com/people/v1/contacts
- **Contacts API v3 migration guide** — https://developers.google.com/people/contacts-api-migration
- **Google Workspace status dashboard** — https://www.google.com/appsstatus/dashboard/
- **Google APIs on GitHub (org)** — https://github.com/googleapis
- **Google API client libraries** — https://github.com/googleapis/google-api-python-client ·
  https://github.com/googleapis/googleapis

Google publishes no repository dedicated to the People API — it is reached through the generic
Google API client libraries above, or over plain REST as this app does.

---

Researched and endpoint-verified against the live documentation on 2026-08-02. Every path, parameter
and scope in this README was read off `developers.google.com/people`, not recalled. Status surfaces
move; re-check with `_tools/audit.ts` conventions in mind if a probe starts failing for everyone at
once.
