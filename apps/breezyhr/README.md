# Breezy HR

Manage positions, candidates, pipelines, scorecards, notes, messages and webhooks in **Breezy HR**,
the applicant tracking system, over the **Breezy v3 API**.

- **Categories** — hr
- **Auth methods** — access-token (`Authorization: <token>`, a Personal Access Token or a
  `/signin` session token)
- **Actions** — 32
- **Health checks** — `service` (declared unavailable, informational), `api` (unsigned `GET /user`,
  a schema-correct auth error passes), `quota` (rate-limit headers off a signed `GET /user`,
  informational) + the derived `auth:access-token`
- **Egress allowlist** — `api.breezy.hr`
- **API docs** — https://developer.breezy.hr/reference/overview
- **Icon** — the vendor's own mark from breezy.hr's `<link rel=icon>`, embedded verbatim (256x256 PNG)

Verified on 2026-10-06 against the OpenAPI document embedded in each `developer.breezy.hr/reference/*.md`
page and live unauthenticated probes of `api.breezy.hr`. The only deprecation wording in the reference
is the `filter_text` parameter on `GET /company/{id}/candidates/search`, which is not exposed (free-text
search is Search Candidates, the POST form).

## Connecting

Create a Personal Access Token in Breezy: avatar > My Settings > API Keys > Create API Key. It starts
`breezy_pat_` and is shown once. A session token also works: `POST https://api.breezy.hr/v3/signin`
with `{"email","password"}` returns an `access_token` (valid 30 days from last use, dead after
`/signout`). Paste either into the one field. The password flow is deliberately not modelled: a
credential that holds a password would have to call the network from `sign`, which the app contract
forbids, and a PAT does not expire. The company's plan must include the Developer API (a 403 otherwise).

## Things most likely to go wrong

1. **A bad token is HTTP 400, not 401.** `{"error":{"type":"invalidAccessToken"}}` (and
   `missingAccessToken` with no header), measured against the live API. The auth check classifies by
   `error.type`, and the `api` health check treats Breezy's error envelope as proof the app is serving.
2. **Candidates only exist under a position.** Every candidate route is
   `/company/{company}/position/{position}/candidate/{id}`; the wrong position is a 412, so keep the
   position id next to the candidate id. Candidate pools are positions with `org_type: pool`. Find a
   candidate across positions with Find Candidate by Email (exact, immediately consistent) or Search
   Candidates (free text, index-backed, eventually consistent: a candidate created seconds ago may
   be missing).
3. **The docs contradict themselves on Find Candidate by Email.** The prose says each hit carries only
   `_id`, `name`, `creation_date` and `position`; the published schema lists the full list-candidate
   shape. Hits are returned as sent, so read `position._id` from them rather than assuming other fields.
4. **Creating an `applied` candidate can answer 202.** If the position's application form has required
   fields the payload lacks, Breezy emails the candidate a link and creates nothing yet. Create
   Candidate returns `{accepted: true, message}` then, not a candidate. `sourced` (the default) lands in
   "Applied" at once. 409 means the candidate is already on the position.
5. **Stage and state changes return 204 with no body.** Set Candidate Stage, Set Position State and Add
   Candidate Scorecard return `{ok: true, ...}` built by the app. Unknown pipeline ids do not 404: Get
   Pipeline silently returns the default pipeline's stages.
6. **Rate limit: 100 requests per 60-second window per token**, with `X-RateLimit-*` headers on every
   response and a 429 beyond it. The 429 error text includes the reset header. The quota health check
   reports `unknown` if the headers are absent; they could not be observed without a live token.
7. **Pagination is opt-in and per endpoint.** Positions and candidates take `pageSize` (max 50) and
   `page`; without `pageSize` everything comes back in one response. Streams and conversations take
   `skip` in pages of 50. A full page returns `nextPage` / `nextSkip`; a stream page containing the
   record flagged `first_activity: true` is the last.

## Actions

| Area        | Actions |
| ----------- | ------- |
| Account     | user-get, company-list, company-get, department-list, category-list, custom-field-list |
| Pipelines   | pipeline-list, pipeline-get |
| Positions   | position-list, position-get, position-create, position-update, position-set-state |
| Candidates  | candidate-list, candidate-get, candidate-create, candidate-update, candidate-find-by-email, candidate-search, candidate-set-stage, candidate-move |
| Evaluation  | candidate-scorecard-add, candidate-note-add |
| Messaging   | candidate-message-send, candidate-conversation-list, candidate-stream-list |
| Webhooks    | webhook-list, webhook-create, webhook-update, webhook-delete, webhook-pause, webhook-resume |

## Not covered

`/signin` and `/signout` (see Connecting), `/user/details`, position stream, position team, position
custom-field read/update, candidate custom-field read/update, custom-attribute and education/work-history
append, the candidate meta bundle, documents (list, upload), resume download and upload, resume-parsing
candidate creation, questionnaires (list, get, send, submit), message templates, assessments (list,
upsert, delete) and background checks. File endpoints are multipart or binary, which a JSON action
cannot carry; the rest were trimmed to keep the action count near 30. Webhook payload verification
(`webhook-security`) and the event catalogue (`webhook-events`) were not read, and no trigger is
declared.
