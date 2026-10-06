# Recruiterflow

Applicant tracking and recruiting CRM ([recruiterflow.com](https://recruiterflow.com)) over its
external API at `api.recruiterflow.com/api/external`.

Verified 2026-10-06 against Recruiterflow's own OpenAPI 3.0 document
(`https://recruiterflow.com/swagger.yml` — JSON despite the extension, 128 paths) and live probes.

## Auth

One method: **API Key**, sent as `RF-Api-Key: <key>` by the Auth `sign` hook (never in an action).

The credential test calls `POST /api/external/info` and passes only on the documented
`{"data":{"display_name"}}` body. Verdicts come from the response body, not the status: a missing key
answers **HTTP 400** `{"message":"Please supply an API key"}`, a wrong one **HTTP 401**
`{"message":"Invalid API key"}`.

## Actions (24)

| Area | Actions |
|---|---|
| Candidates | `candidate-list`, `candidate-get`, `candidate-search`, `candidate-add`, `candidate-update`, `candidate-add-to-job`, `candidate-move-to-stage`, `candidate-disqualify`, `candidate-note-add` |
| Jobs | `job-list`, `job-get`, `job-count`, `job-search`, `job-stage-names` |
| Clients / contacts | `client-list`, `client-get`, `client-add`, `contact-list`, `contact-get`, `contact-add` |
| Other | `user-list`, `user-get`, `deal-list`, `tags-list` |

List actions return `{ items, total? }`. `total` appears when "Include total count" is on (the API
then answers `{"data": [], "total_items": n}`). A shape the document does not describe comes back as
`{ items: [], raw }` instead of being silently reported as empty. Single records and write results pass
through as the vendor returned them.

`candidate-add`, `candidate-update` and `contact-add`, `client-add` take the common fields as params
and an **Additional fields** JSON object for the rest (education, experience, tags, custom fields…);
the named params win on conflict. `candidate-update` is a *complete update per key*: a key sent
replaces the stored value.

## Health

- `service` — declared absence (`informational`): Recruiterflow publishes no status page
  (`status.recruiterflow.com` answers marketing-site HTML, not a status schema).
- `api` — unsigned `POST /info`; the vendor's "Please supply an API key" body passes (reachability).
- `auth:api-key` — derived from the Auth `test`.

No quota check: the document describes no rate-limit headers.

## Not covered

Deliberately left out (still reachable via the 128-path API): activity/call/email/calendar-event
listings, custom activities, file and profile-image uploads (multipart), scorecards and ratings,
placement records, sequences and campaigns, deals other than listing, locations, job
create/update/open/close, custom-field and reference-data lists, `document/get`.
`/api/external/status/list` is **deprecated** by the vendor and is not used.

## Icon

`assets/icon.svg` embeds Recruiterflow's own web-clip mark (`rf_webclip.png`, 256x256) verbatim as a
base64 PNG inside an SVG wrapper; the vendor serves no SVG (`/favicon.svg` is a 404 page).
