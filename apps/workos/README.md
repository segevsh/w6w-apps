# WorkOS

Manage the enterprise features a B2B product has to ship before an enterprise
will buy it: SSO, SCIM user provisioning, audit logs, and the Admin Portal that
lets a customer configure all three themselves.

- **Categories** — security, developer-tools
- **Auth methods** — api-key
- **Actions** — 23
- **Egress allowlist** — `api.workos.com` (the `service` health check adds
  `status.workos.com`)
- **Website** — https://workos.com
- **API docs** — https://workos.com/docs/reference

## Setup

### API Key

WorkOS Dashboard → **API Keys**. The key is sent as `Authorization: Bearer`.

**The prefix is the environment.** `sk_test_…` and `sk_live_…` see entirely
different data — the same organization does not exist in both. There is no
environment field to fill in because the key already says which one it is, and
the connection test reports it back, so a connection labelled "production" that
is actually staging is visible at a glance rather than after a workflow writes
to the wrong place.

**WorkOS keys are not scopeable.** One key reads every organization, mints Admin
Portal links and creates users; there is no read-only variant. The credential is
as powerful as the dashboard, which is worth knowing when deciding where the
connection lives.

## The model

An **Organization** is one customer company, and almost everything hangs off
one:

| Object | What it is |
|---|---|
| **Organization** | One customer company. The unit of everything below |
| **Connection** | Their SSO link to Okta, Entra, Google, or generic SAML/OIDC |
| **Directory** | Their SCIM feed — users and groups pushed at WorkOS |
| **Directory User / Group** | A person or team **as their system describes them** |
| **User** | An identity in *your* product that can authenticate |
| **Organization Membership** | The join between a User and an Organization, carrying the role |
| **Event** | The ordered stream of everything that changed |

## The two actions that matter most

### `portal-link-create`

Configuring SSO against a customer's identity provider is a fiddly,
per-customer, per-IdP job that normally means a shared screen and an engineer.
The Admin Portal hands it to the person who actually administers Okta or Entra,
in a page WorkOS hosts and validates.

So onboarding becomes: create the organization, mint a portal link, email it to
the customer's IT contact, wait for `dsync.activated` or `connection.activated`.

**The link is a bearer credential with a five-minute life.** Anyone holding the
URL can configure that organization's authentication. It is deliberately short
because it is meant to be clicked immediately — a workflow that mints one and
sits on it hands somebody a dead link, and one that logs it has published a
configuration door. This action logs the organization and the intent, never the
link.

`intent` selects the page: `sso`, `dsync`, `audit_logs`, `log_streams`,
`domain_verification`, `certificate_renewal`.

### `event-list`

**`directory-user-list` answers "who is here now". That is a different question
from "what changed", and the gap between them is where offboarding lives.**

A user deprovisioned in the customer's Okta simply stops appearing in the
listing — no tombstone, no flag, nothing to react to. The event stream carries
`dsync.user.deleted` explicitly, in order, with the user's last known state
attached.

A provisioning workflow reads events; a reporting one reads listings. Getting it
the wrong way round produces a system that creates accounts reliably and never
closes them.

Two things are unusual about the endpoint:

- **`events` is required.** There is no "read everything" — a caller must name
  the types it wants, so this action defaults to the directory trio.
- **The cursor is an event id**, not an opaque blob. Store `lastEventId`, pass
  it as `after` next run, and the stream resumes exactly where it stopped.
  `rangeStart` is the alternative for a first run, and the two are mutually
  exclusive.

## Actions

| Key | Type | Description |
|---|---|---|
| `organization-list` | read | Customer companies, filterable by verified domain |
| `organization-get` | read | One customer, and which domains will not route SSO |
| `organization-create` | perform | Register a customer |
| `organization-update` | perform | Rename, or **replace** the domain list |
| `organization-delete` | perform | Remove a customer and everything under it |
| `connection-list` | read | SSO connections, or only the unfinished setups |
| `connection-get` | read | One connection, its state and routed domains |
| `portal-link-create` | perform | **A page where the customer configures their own SSO or SCIM** |
| `directory-list` | read | The SCIM directories customers have connected |
| `directory-user-list` | read | Who the directory says works there **now** |
| `directory-user-get` | read | One person, with their custom SCIM attributes |
| `directory-group-list` | read | The groups a customer pushes — the source for roles |
| `event-list` | read | **The ordered stream of what changed** |
| `user-list` | read | Identities that can authenticate |
| `user-get` | read | One identity, its verification and last sign-in |
| `user-create` | perform | Create an identity |
| `user-update` | perform | Correct a name, or change verification |
| `organization-membership-list` | read | Who belongs where, with what role |
| `organization-membership-create` | perform | Grant access immediately |
| `invitation-send` | perform | Invite instead — the recipient proves the address |
| `audit-log-event-create` | perform | Write into a customer's audit log |
| `audit-log-export-create` | perform | Start an export of one |
| `audit-log-export-get` | read | Whether it finished, and its download URL |

## Five things that go wrong quietly

### 1. A domain is a claim, not a fact

`organization-create` and `organization-update` take domains with a **state**:

- **`pending`** — WorkOS makes the customer prove ownership by DNS record.
  Until they do, **the domain does not route SSO**.
- **`verified`** — you are asserting the customer owns it, on your own
  authority, and it routes immediately.

Asserting `verified` from a workflow means anyone who can trigger that workflow
can claim a domain, and claiming a domain decides where the people with those
email addresses get sent to log in. That is a real attack if the organization
name comes from a signup form. **`pending` is the default here**, and asserting
verified domains emits a warning.

The other half: `organization-get` pulls unverified domains out into their own
field, because "SSO says active and still doesn't work" is nearly always a
domain sitting at `pending`.

### 2. `domain_data` REPLACES the list

Sending one domain to `organization-update` in order to *add* a second one
removes the first. Removing a verified domain stops routing SSO for everybody
with an address at it — **a silent lockout for an entire customer's staff, with
no error anywhere**.

The parameter is optional and documented as the complete list; leaving it blank
changes only the name, which is what most callers want.

### 3. A User is not a Directory User

- a **Directory User** is a record the customer's system pushed, describing
  somebody who works there;
- a **User** is an identity in your product that can authenticate.

They link when the person signs in, not when the directory syncs. A customer
with five hundred directory users and three users is in a correct state — it
means 497 of their staff have never logged in, not that anything is broken.

### 4. Custom SCIM attribute names are per-customer

`directory-user-get` returns `custom_attributes`, which is where department,
cost centre, employee number and manager live — exactly what a provisioning rule
reads. What Acme calls `department` their next customer calls `dept`, so a
workflow reading a fixed key works for one customer and silently produces
`undefined` for the next. The action returns `customAttributeNames` alongside
the values so the mismatch is visible rather than mysterious.

### 5. A membership with no role is still an assignment

`organization-membership-create` grants access **immediately, with no
invitation and no acceptance step** — right for provisioning driven by the
customer's own directory, wrong as a response to anything a user supplied.
`invitation-send` is the counterpart that makes the recipient prove they control
the address first.

Omitting `role_slug` does not grant nothing: WorkOS applies the environment's
**default role**. A workflow that forgets the field does not fail, it grants
whatever the default happens to be, so this action logs when it falls back.

## Audit logs

They are the enterprise checklist item your product produces and the customer's
security team consumes; WorkOS can stream them to the customer's own SIEM, so an
event written here reaches their Splunk with no integration on your side. A
workflow is a good place to write them because workflows do the things worth
logging.

Three rules that are easy to break:

1. **The schema is registered in advance.** An event `action` must already exist
   in the dashboard with its metadata fields declared. An unregistered action or
   an undeclared key is rejected.
2. **`occurred_at` is yours to set**, so a retry or a batch replay preserves the
   real order. Blank stamps now.
3. **An audit log is append-only** — no edit, no delete. A wrong event stays
   wrong and personal data written by mistake cannot be taken back out. Put ids
   in metadata, not contents.

**There is no endpoint that reads events back.** Retrieval is an export:
`audit-log-export-create` requests a range (both ends required — no unbounded
export), and `audit-log-export-get` polls until `state` is `ready` and a `url`
appears. That URL is a pre-signed link to a customer's complete audit trail, so
it is returned and never logged; `ready` is reported as a boolean so a polling
step can branch without touching it.

## Health checks

| Key | Kind | What it answers |
|---|---|---|
| `service` | service | Is WorkOS up — the API, and the paths customers' staff depend on? |
| `environment` | dependency | Which environment is this key pointed at, and does it work? |
| `quota` | quota | Declared absence — see below |

`service` reads `status.workos.com`'s Statuspage per component. The split worth
making is between **the API this app calls** and the **runtime paths a
customer's employees depend on**: the API being down stops a workflow while
people already signed in carry on, but **SSO being down stops an entire
customer's staff logging in**, whatever this app is doing at the time. So SSO
and Directory Sync count at full weight and are reported by name.

`environment` exists for a failure that is not an outage: **a staging key doing
production work**, which succeeds at every call and quietly reads and writes the
wrong world. A credential test cannot see it — the credential is fine. It shows
up as an environment emptier than expected, so this reports the environment and
the organization count together, and calls zero organizations `degraded` with
the reason spelled out. A `401` is left `unknown`, since the derived
`auth:api-key` check owns credential failures.

`quota` is a **declared absence**, and the measurement is written into it.
Verified 2026-08-18, a response from `api.workos.com` carries no `x-ratelimit-*`
header at all — the set is Cloudflare and Envoy plumbing (`cf-ray`,
`x-envoy-upstream-service-time`, `x-request-id`) plus the usual security headers
— and WorkOS publishes no usage endpoint. The only signal is the `429` with
`Retry-After` returned *at* the limit, which describes the request that just
failed rather than remaining headroom. A poll would spend a request per interval
to report `ok` until the moment it reported `down`, so the 429 is surfaced on
the call that hit it instead.

## What this app deliberately does not do

- **Set passwords.** WorkOS accepts a `password` on user creation; a workflow
  that sets one has it in its inputs, its logs and its run history, and invite
  or magic-link flows do not. A test asserts no action offers the field.
- **Authenticate end users** — `/user_management/authenticate` exchanges an
  authorization code for a session. That belongs in your application's request
  path, not a workflow step.
- **Manage roles or organization domains as objects** — both are configuration
  the dashboard owns.
- **Webhooks** — WorkOS's own webhook configuration is a dashboard concern, and
  `event-list` covers the same ground for a workflow, resumably.

## Errors

WorkOS answers authentication failures with `{"message": "…"}` and validation
failures with `{"code", "message", "errors": [{"field", "code"}]}`. The `errors`
array names what was wrong and is surfaced alongside the message. A `401`
additionally points at the `sk_test_` / `sk_live_` distinction, because "wrong
key" and "right key, wrong environment" look identical and have different fixes.

Every path this app calls was verified to route against `api.workos.com` on
2026-08-18: each answers `401 {"message":"Unauthorized"}` where an unknown path
answers a `404`, so the 401s are proof the routes exist.
