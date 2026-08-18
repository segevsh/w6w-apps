# Loops

Send transactional email, track events, and manage contacts and campaigns in
Loops.

- **Categories** — email, marketing, communication
- **Auth methods** — api-key
- **Actions** — 21
- **Egress allowlist** — `app.loops.so`
- **Website** — https://loops.so
- **API docs** — https://loops.so/docs/api ·
  schema: `https://app.loops.so/openapi.json` (OpenAPI 3.1, served from the
  vendor's own app host)

## Setup

### API Key

1. Loops → **Settings → API**, and create a key.
2. Paste it into the connection's **API Key** field. It is sent as a bearer
   token.

Loops issues **one key per workspace**. There is no OAuth flow, no per-user
token and no scope selection — worth stating rather than leaving someone
hunting for a narrower credential that does not exist.

## Actions

| Key | Type | Description |
|---|---|---|
| `transactional-send` | perform | Send a published template to one address |
| `event-send` | perform | Fire an event, which can trigger workflow email |
| `transactional-list` | read | Templates, all of them or only the sendable ones |
| `transactional-get` | read | One template, including whether it is published |
| `transactional-publish` | perform | Publish a draft so it can be sent |
| `event-pattern-list` | read | The event names Loops has seen |
| `event-pattern-get` | read | Look one up by name before firing it |
| `contact-create` | perform | Add a new contact (fails if known) |
| `contact-update` | perform | Upsert a contact by email or user id |
| `contact-find` | read | Look up a contact |
| `contact-delete` | perform | Permanently delete a contact and their history |
| `contact-property-list` | read | The properties a contact write may set |
| `contact-property-create` | perform | Define a custom property |
| `contact-suppression-get` | read | Is this address suppressed after a bounce? |
| `contact-suppression-remove` | perform | Lift a suppression |
| `mailing-list-list` | read | Mailing lists, and the ids that subscribe people |
| `audience-segment-list` | read | Segments campaigns can target |
| `campaign-list` | read | Campaigns and their state |
| `campaign-get` | read | One campaign |
| `workflow-list` | read | Workflows and their triggers |
| `workflow-get` | read | One workflow and its nodes |

## The shape of the product is the shape of the app

Loops keeps the **email body** and the **audience logic** in Loops. A workflow
supplies an address, some variables and an event name; the template that
renders and the loop that fires are built and versioned in the Loops editor.

There is no "send this HTML" endpoint. That is deliberate on their part rather
than a gap here, and it is why this app reads campaigns and workflows but does
not author them.

## Four things that go wrong quietly

Each returns something plausible rather than an error.

### 1. Create fails on an existing contact; update upserts

`contact-create` answers `409` for a known email — the spec models it — which
turns a perfectly normal re-run of a signup workflow into a failed step.
`contact-update` creates-or-updates in one call and is what most workflows
actually want. The description on each says so.

### 2. Changing an email address needs a `userId`

Loops' own note on the update endpoint: *"If you want to update a contact's
email address, the contact will first need a `userId` value."*

Keyed by email alone, a new address is not a rename. Loops creates a **second**
contact, and the first stays behind — still subscribed, still receiving
campaigns. This app refuses that combination locally rather than forking the
record, and the parameter hint explains why.

### 3. A template must be published before it can be sent

An unpublished transactional email has an id and reads back fine from
`transactional-get`; `POST /v1/transactional` then answers `404`, which looks
like a wrong id rather than an unpublished template. `transactional-publish` is
the missing step, and `transactional-list` can list only the sendable ones.

`dataVariables` is checked against the template too — Loops rejects a send whose
variables do not match what the template declares, rather than rendering a blank
paragraph.

### 4. `mailingLists` is an object, not an array

Loops takes `{listId: true | false}` — `true` adds the contact to the list,
`false` removes them. An array of ids is **ignored rather than rejected**, so a
"subscribe" that changes nothing looks like a success.

These actions accept the friendly comma-separated form and convert it to
all-`true`, and pass a JSON object straight through so removals stay
expressible.

## Retries that do not send twice

The two sending endpoints accept an `Idempotency-Key` header, described by the
spec as *"a unique ID for this request (maximum 100 characters) to avoid
duplicate emails"*. Reusing a key with a **different** body is refused with a
`409` — and that second half is what makes it trustworthy rather than merely
convenient: a retry of the same step cannot quietly become a second, subtly
different email.

Both `transactional-send` and `event-send` offer **Make Retries Safe**, which
sends the step's invocation id as the key: stable across a retry of that step,
different for the next one. It is off by default, and both actions declare
`idempotent: false`, because without it they are not.

## Smaller sharp edges

- **`contact-find` returns an array**, and an unknown contact is `[]` rather
  than a `404`. Reading `result.email` off it yields `undefined`, not an error.
- **Custom properties live at the top level of the contact**, beside
  `firstName` — not under a `properties` key. They must already exist in the
  workspace, and a property's **type is permanent**: Loops offers no endpoint to
  change or delete one. This app refuses a custom property that would shadow a
  built-in field, since a custom `email` would overwrite the identity the call
  is keyed on.
- **Suppression is not unsubscription.** A contact is suppressed when their
  address bounced or complained, and Loops refuses to send regardless of their
  subscription state — so "why did this not arrive" is often answered by
  `contact-suppression-get` rather than the contact record.
- **Deleting a contact loses their unsubscribe record.** If they are
  re-imported later, nothing remembers they opted out. `contact-update` with
  Subscribed off is what "stop emailing this person" usually means; delete is
  for erasure requests, and requires a confirmation.
- **`GET /v1/lists` is the one unpaged collection.** Every other list answers
  `{pagination, data}` with a cursor that is **null** — not absent — on the last
  page.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Are the API, transactional and campaign components up? |
| `quota` | quota | Declared unavailable — see below |

`status.loops.so` is a real Statuspage — verified 2026-08-18, its
`api/v2/status.json` returns 209 bytes of JSON with page id `k5s3969jdp9t`.
That check is worth doing rather than assuming: two of the five status surfaces
probed while building this batch returned HTTP 200 for *every* path, because
they are single-page apps with a catch-all route, so "the JSON endpoint 200s" is
not evidence on its own.

The check reads the three components this app's actions ride on and ignores the
SMTP relay, the web app and webhooks — real Loops services that no action here
touches.

`quota` is a **declared absence**, and it is worth declaring because Loops
clearly has a limit: the OpenAPI document defines `429` responses, so exhaustion
is a modelled outcome. What it does not define is any way to see the allowance
first. Searching the whole document for `ratelimit`, `rate limit` and
`retry-after` returns no header declaration anywhere — the only hits on the
subject are the two `429` status codes. There is no usage endpoint either;
`GET /v1/api-key` returns the team name and nothing else. The plan's *email
sending* allowance has no API at all.

## What this app deliberately does not do

- **Build emails, workflows and campaigns.** The API can create workflow nodes,
  themes, components and campaign drafts. That is authoring a design tool
  through a workflow step, and the editor is where it belongs.
- **Upload assets.** `POST /v1/uploads` is a two-step signed-URL flow for editor
  images, needing a second host and a byte stream the sandbox cannot produce.
- **Dedicated sending IPs** — an infrastructure setting, not a workflow.

## Errors

Loops' envelope is `{"success": false, "message": "...", "error": ...}`. The
message is the useful half — *"Invalid API key"*, *"Contact not found."* — and
the whole body is surfaced because `error` sometimes carries per-field detail.
