# Teachable

Manage Courses, Lectures, Quizzes, Videos, Users, Enrollments, Webhooks, Pricing Plans and
Transactions on the **Teachable Public API v1**.

- **Categories** — commerce, crm
- **Auth methods** — api-key
- **Actions** — 21
- **Triggers** — 5 (poll)
- **Health checks** — 2 (`service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `developers.teachable.com` (the `service` check adds
  `www.teachablestatus.com` to its own hook allowlist, never to the app's)
- **Website** — https://teachable.com/
- **API docs** — https://docs.teachable.com/reference
- **Status page** — https://www.teachablestatus.com/ (redirected from `status.teachable.com`)

Teachable is a platform for selling online courses and coaching. A **Course** holds
**Lecture Sections**, each a list of **Lectures**; a Lecture's content is one or more
**Attachments** — text, a **Video**, or a **Quiz**. A **User** (student, author, affiliate or
owner) is tied to a Course by an **Enrollment**. A **Pricing Plan** is what a Course is sold under;
a **Transaction** is the resulting sale record.

> **Everything below was verified against Teachable's own sources on 2026-08-30** — the OpenAPI
> 3.0.2 document Teachable's Readme.io-hosted reference embeds per-page
> (`docs.teachable.com/reference`, `info.title` `teachable-public-api`), the
> "Authentication", "Rate Limits" and "Pagination" guides
> (`docs.teachable.com/docs/{authentication,rate-limits,pagination}`), and live probes against
> `developers.teachable.com` and `www.teachablestatus.com`. Nothing here came from a third-party
> integration directory.

## The three things most likely to cost someone a day

### 1. The real API host is not the docs host, and the credential header is a literal `apiKey`

The documentation lives at `docs.teachable.com`; the API itself is
`https://developers.teachable.com` — the OpenAPI document's only declared `server`, confirmed live
(an unauthenticated `GET /v1/courses` there answers `401` from a Kong gateway, not a 404 or an SPA
shell). The credential travels as a header **literally named `apiKey`** — not `Authorization`, no
`Bearer` prefix. The authentication guide's own curl example is
`curl --header 'apiKey: YOURKEYHERE'`. See [`lib/client.ts`](lib/client.ts) and
[`auth/api-key.ts`](auth/api-key.ts).

Two different 401 bodies were measured live, and they mean different things: no `apiKey` header at
all answers `{"message": "No API key found in request"}`; a syntactically-present but wrong key
answers `{"message": "Invalid authentication credentials"}`. `auth/api-key.ts#test` reads the
message, not just the status code, so a Connection whose key never reached the request is reported
differently from one whose key was simply revoked.

### 2. The vendor's own docs disagree with themselves on two numbers

The rate-limits guide states the limit is *"100 requests per minute for every school"*, then its own
*example* 429 response shows `RateLimit-Limit: 360` — a documented inconsistency, not a typo this
app papers over. `health/quota.ts` never hard-codes either number; it reads
`RateLimit-Limit`/`RateLimit-Remaining`/`RateLimit-Reset` off the wire on every signed call.

Separately, the pagination guide says the default page size is 25 when `per` is left unset, but
individual endpoints' own OpenAPI parameter descriptions say 20 (`/courses`, `/users`,
`/transactions`, `/webhooks/.../events`) or 5 (`/pricing_plans`) — three different numbers across
one API. Every paginated action here prefills `per` explicitly with the *endpoint's own* documented
number rather than relying on whichever default happens to be live (see the per-action comments and
[`lib/client.ts`](lib/client.ts)).

### 3. Webhooks are read-only through this API

There is no `POST /v1/webhooks` in the spec — only `GET /v1/webhooks` and
`GET /v1/webhooks/{id}/events`. A webhook is created and edited in the school admin UI (Settings >
Webhooks); this app can only read what is already configured there and the delivery events it has
fired. Don't go looking for a `webhook-create` action — it isn't a gap, the vendor's API doesn't have
one.

## What isn't here: the per-student OAuth2 surface

The reference also documents a second, separate API under `/v1/current_user/*` — a student's own
profile, courses and progress — secured by OAuth2 whose `authorizationUrl` is
`https://sso.teachable.com/secure/{school_id}/identity/oauth_provider/authorize`, a per-school host
confirmed live in that page's embedded schema. This is a materially different auth model (an
individual student authorizing their own access, via a school-specific authorize URL) and a
different persona than the school-owner API-key surface this app covers, so it is deliberately left
out rather than folded in as a second Auth method. A concrete workflow needing student self-service
would justify a second Auth method (`oauth2`, with a `schoolId` connect-time field feeding the
authorization URL template) and its own action surface — see `index.ts` for the full reasoning.

## Health checks

- **`service`** (`kind: service`, unsigned) — reads `www.teachablestatus.com/api/v2/summary.json`,
  an Atlassian Statuspage on Teachable's own domain (confirmed via `status.teachable.com`'s 301
  redirect and the page's self-identifying `page.name`/`page.url`). Two of its 63 components are
  named after real Teachable hosts — `developers.teachable.com` (this app's own API) and
  `teachable.com` — which is reported by name so an incident there is unambiguous.
- **`quota`** (`kind: quota`, signed) — reads the `RateLimit-*` response headers off the same cheap
  `GET /v1/courses?per=1` call the `auth:api-key` probe uses. Because the vendor only documents
  these headers on a 429 response, this check reports `unknown` — honestly, not a fabricated `ok` —
  when an ordinary response doesn't carry them.
- **`auth:api-key`** (derived from `Auth.test`) — the same `GET /v1/courses?per=1` probe. Chosen
  because it requires a credential (confirmed live), needs no special scope (Teachable has no scoped
  keys), and its response carries no credential material. Teachable has no whoami/`/me` endpoint in
  this API, so there is no Mailjet-`/apikey`-shaped leak to avoid here.

## Development

```bash
deno task check      # typecheck
deno task lint        # deno lint
deno task fmt          # format (lineWidth 100, semicolons, double quotes)
deno task test          # unit tests (mocked HookContext, no network)
deno task validate       # manifest + behavior audit
```

## Triggers

| Trigger — title | Mechanism | Wrapped action | What the run gets |
| --- | --- | --- | --- |
| `new-transaction` — New Transaction | Poll (since filter) | `transaction-list` | Each new sales transaction in the school |
| `new-course` — New Course | Poll (snapshot) | `course-list` | Each course newly added to the school |
| `new-pricing-plan` — New Pricing Plan | Poll (snapshot) | `pricing-plan-list` | Each pricing plan newly added to the school |
| `new-enrollment` — New Enrollment | Poll (newest first) | `course-enrollments-list` | Each student newly enrolled in the chosen course |
| `new-quiz` — New Quiz | Poll (snapshot) | `quiz-list` | Each quiz newly added to the chosen lecture |

Polled through the `transaction-list` action with `start` set to the last check minus a two-minute overlap, paging with `page`/`per` (a window longer than three pages resumes on the next check), deduped by transaction id. The first check reads nothing and emits nothing; transactions from before it are never emitted. New transactions can take up to two minutes to appear after the sale. Source: `start` — "The beginning of the time period to return results for (exclusive), in ISO8601 format" ([List transactions](https://docs.teachable.com/reference/listtransactions), verified 2026-11-09). The users list was not used: it has no sort and no created-since filter.

`new-course` and `new-pricing-plan` read every page of the collection (`page`/`per`, `meta.number_of_pages`; a school's catalogue is small) and diff the ids; `new-enrollment` asks `course-enrollments-list` for `sort_direction=desc` ("Enrollments are sorted by the 'enrolled_at' datetime") on the course you choose; `new-quiz` diffs the quiz ids of the course and lecture you choose. The first check of each snapshot trigger reads and seeds, emitting nothing. Sources: [List courses](https://docs.teachable.com/reference/listcourses), [List pricing plans](https://docs.teachable.com/reference/listpricingplans), [List course enrollments](https://docs.teachable.com/reference/showcourseenrollments), [List quizzes](https://docs.teachable.com/reference/listquizzes), verified 2026-11-10.

Not covered: `user-list` (no sort and no created-since filter, `search_after` is documented only past 10,000 users), `webhook-list` and `webhook-events-list` (webhook configuration and delivery logs are admin output; webhooks are edited in the school admin).
