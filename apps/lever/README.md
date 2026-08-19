# Lever

Read and move candidates through the hiring pipeline, manage postings, notes
and archive state.

- **Categories** — hr, productivity
- **Auth methods** — api-key
- **Actions** — 12
- **Egress allowlist** — `api.lever.co`, `api.eu.lever.co`, `api.sandbox.lever.co`, `status.lever.co`
- **Website** — https://lever.co
- **API docs** — https://hire.lever.co/developer/documentation

Built against Lever's own developer documentation and probed live on
2026-08-19.

## A plain list of candidates is missing rows, and says nothing

This is the fact to know before writing anything against Lever. From its
documentation, on the `confidentiality` parameter: *"if unspecified, defaults to
non-confidential. To get both confidential and non-confidential opportunities
you must specify `all`."*

So `GET /opportunities` silently applies a filter nobody asked for. A workflow
counting candidates, exporting a pipeline or reconciling against another system
gets a number that is quietly wrong, with a 200 and nothing to suggest it.

And it compounds. An API key can only *see* confidential data if that was
granted **when the key was created** — Lever does not allow adding it later — so
there are two independent ways to be short of records, neither visible in a
response. Both listing actions here default to `all` and report what they used,
and `auth.test` reports at connect time whether the key can see confidential
data at all.

## A contact is a person; an opportunity is one application

Lever deprecated its `/candidates` endpoints in 2020. What replaced them
separates the **contact** — the human, with their email and phone — from the
**opportunity**, which is one application to one posting. Somebody who applies
three times is one contact and three opportunities.

So deduplicating a pipeline by opportunity id counts people several times.
`opportunity-list` returns `contactIds` and `peopleCount` for that reason, and
those are almost always the numbers somebody means by "how many candidates".

## Every write is signed by a person

Lever attributes actions to users through `perform_as`, and on create it is the
**only required parameter** — "All query parameters except the `perform_as`
parameter are optional". Every write action here requires it, and an `index.ts`
test asserts that.

Without a deliberate answer, automated notes and stage moves appear under
whoever created the API key, which is how a recruiter ends up apparently writing
comments at three in the morning. `user-list` is where the id comes from — and
it flags **deactivated** users, whose ids still work, so a workflow can keep
signing notes as somebody who left.

## Creating a candidate for a known email never creates a person

Lever's words: *"we will always attempt to dedupe the candidate. If a match is
found, we will create a new Opportunity that is linked to the existing matching
candidate's contact (i.e. we never create a new contact, or person, if a match
has been found). **The existing candidate's contact data will take precedence
over new manually provided information.**"*

That last sentence is the sharp one: a create carrying a corrected phone number
against a known email keeps the *old* number and returns success.
`opportunity-create` looks the email up first so that at least comes back as
`deduped: true`.

## `offset` is a token, not a number

Despite the name. Lever returns `next` on every paginated response and accepts
only a value it produced — "You can only pass in an offset that was returned to
you via a previously paginated request". There is no way to jump to page five,
and no way to parallelise a walk of the pipeline. The actions return it as
`nextCursor` and take it back as `cursor`.

Two more parameter shapes worth knowing: **`include` is exclusive** — naming one
field returns *only* that field, which is the opposite of what it sounds like —
and `expand` is the additive one, inlining a referenced object in place of its
id.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `opportunity-list` | search | The pipeline, with confidentiality made explicit |
| `opportunity-get` | read | One application, and the person behind it |
| `opportunity-create` | perform | Add a candidate |
| `opportunity-stage-set` | perform | Move somebody through the pipeline |
| `opportunity-archive` | perform | Reject, hire, or reopen |
| `note-list` | read | What has been written about a candidate |
| `note-add` | perform | Write on a candidate's profile |
| `offer-list` | read | What has been offered, and where it got to |
| `posting-list` | search | The jobs |
| `stage-list` | read | The pipeline's stages, with their ids |
| `archive-reason-list` | read | Why candidates get closed out — and which mean hired |
| `user-list` | search | Who works here, and whose name to act under |

### Things the actions do that the API does not

- **`opportunity-archive` explains that one endpoint does three things.** The
  reason decides which: an ordinary reason closes a candidate out, one that maps
  to **Hired** with a requisition records a hire and **increments that
  requisition's hire count** — a change to headcount reporting from what looks
  like an archive call — and an *empty* reason **unarchives**. The action looks
  the reason up to say which of the three is happening, and refuses a
  requisition with no reason, which would unarchive while appearing to record a
  hire.
- **`stage-list` and `archive-reason-list` exist because ids are per account.**
  "Phone Screen" is a different UUID in every Lever account, and the API takes
  only ids. Both return a name-to-id map for resolving at run time, which is the
  version that survives a pipeline being rebuilt — and `stage-list` **reports
  duplicate names** rather than collapsing them, since resolving "Onsite" to the
  wrong one of two moves candidates into a stage nobody is watching.
- **`opportunity-get` expands by default.** The stage, owner, contact and
  applications are UUIDs otherwise, and four more requests against an API that
  rate-limits with no header to pace against. It also flags an **anonymized**
  contact — Lever strips personal fields on a data-protection request and keeps
  the record — so an empty name reads as an erasure somebody asked for rather
  than a broken record.
- **`note-add` says what a note is.** Permanent (the API can delete but not
  edit), visible to everyone with access to the candidate, and discoverable in a
  data-subject request. It also notes that a *secret* note is visible to fewer
  people rather than to nobody.
- **`offer-list` separates acceptance from internal approval.** `signed` is the
  candidate accepting; `approved` is only the internal approval chain, which
  happens before sending. It counts the days an offer has been outstanding,
  because that is the one part of hiring with a clock on it.
- **`posting-list` counts published *and* internal as open roles.** Both are
  jobs somebody is hiring for; the difference is whether it is advertised, which
  is a hiring decision rather than a technicality. It also only sends `include`
  when the full description is wanted, since that parameter is exclusive.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | connection | none | Is the API up in *this account's* data centre |
| `quota` | quota | connection | none | Declared unavailable — nothing to read |

### `service` — where a component is only identifiable as (data centre, name)

Lever runs a **Global** and an **EU** data centre, and its status page lists the
same components under each: measured on 2026-08-19, 41 components across seven
groups with duplicated names — two "Integration API & Webhooks", two "Hire", two
"Career Site".

An account lives in one of those, so matching a component by name alone reports
an EU incident to a global customer and vice versa. This check resolves through
`group_id` and reads the row for the data centre the connection names. Same
shape of problem as `apps/digitalocean`, for the same reason.

It also separates the two components that fail independently: **Integration API
& Webhooks** is what this app calls, and **Hire** is what recruiters use. An API
outage stops a workflow while everybody carries on interviewing; a Hire outage
is the reverse. Only the first decides the check's state.

Two whole groups in that feed are partner and third-party dependencies — Slack,
Zoom, background-check vendors — which matter to a recruiter and say nothing
about this API, so the check names its components rather than reading the page's
overall indicator.

### `quota`

A declared absence. Lever's documentation names a 429 — "Lever imposes a limit
of the number of requests a client can make in a short time" — without stating
the budget or the window, and publishes no header on a successful response
either. Exponential backoff is the only available strategy.

The constraint that actually shapes a Lever integration is the **pagination
cursor**: 100 records at a time behind an opaque token only Lever can produce,
so a full pipeline export is inherently sequential whatever the rate limit
allows.

## Icon

`assets/icon.png`, 48×48, downloaded verbatim from
`www.lever.co/images/favicon-lever.png` on 2026-08-19 (md5
`1d1b7daf87a5418bf2ba1e7963c1caf0`) — the icon the site's own `<link rel="icon">`
points at. Checked in both themes with `_tools/icon-legibility.ts`.

## Tests

252 assertions across 17 files: one per action, one for the auth method, one for
the health checks, the client, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

Writing the tests found two real bugs: `compact()` was stripping the `null` that
Lever needs to **unarchive** a candidate, turning that call into a request that
said nothing; and `opportunity-get` relied on a declared parameter default for
`expand`, so an invocation that omitted it got UUIDs and four more requests.

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source, plus three specific to this app: **every listing action sets
confidentiality explicitly**, **every write requires a `performAs`**, and no
action hardcodes a host — the sandbox is a separate account with separate data.
