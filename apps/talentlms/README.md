# TalentLMS

Manage TalentLMS users, courses, enrollments, groups, branches and learning progress.

- **Categories** — hr, productivity
- **Auth methods** — api-key
- **Actions** — 45
- **Egress allowlist** — `*.talentlms.com`
- **Website** — <https://www.talentlms.com>
- **API docs** — <https://market.talentlms.com/pages/docs/TalentLMS-API-Documentation.pdf> (v1; a 67-page PDF, the only reference TalentLMS publishes)
- **Icon** — `assets/icon.svg` is the vendor's own `favicon.svg`
  (`www.talentlms.com/wp-content/themes/talentlms2021/front-end/src/assets/img/favicon.svg`), byte for byte.

## The per-tenant model

Every account has its own host — `acme.talentlms.com` — and the API lives at `/api/v1` on it.
`network.allow` is `*.talentlms.com`, and the subdomain is an **Auth field** that `afterConnect`
records on the connection's redacted `display`; `lib/client.ts` reads it back, so no action
collects a domain or a key (`tests/index.test.ts` asserts it). An account that serves its
learning portal on a mapped custom domain still has its API on the `talentlms.com` host.

## Auth

HTTP Basic with the **API key as the username and an empty password** (the PDF documents only
the PHP library, which sends it that way; an unauthenticated request to any subdomain answers
`401 You need a valid user and password`). Only a super administrator can enable the API and
read the key (Account & Settings → Basic settings). Credentials appear only in `sign`.

The credential probe is `GET /v1/ratelimit`: the reference says it "does not count against your
rate limit", and its body (`limit`, `remaining`, `reset`, `formatted_reset`) never echoes the key.
The verdict is the presence of the `limit` field plus the vendor's own error message — not the
status code alone.

## Two request shapes

The reference lists each endpoint's URL pattern, and they split cleanly:

- **Path-argument calls (GET).** Lookups and one-line mutations carry their arguments in the path,
  `/v1/<endpoint>/<key>:<value>,<key>:<value>` — `/v1/users/id:7`,
  `/v1/removeuserfromcourse/user_id:7,course_id:4`, `/v1/usersetstatus/user_id:7,status:inactive`.
  Note that several **mutations are GETs** (set status, add/remove user to group/branch/course,
  reset progress). Values are percent-encoded, so a comma or colon in a value cannot split an
  argument.
- **Body calls (POST).** Create / edit / delete endpoints (`usersignup`, `edituser`, `deleteuser`,
  `createcourse`, `addusertocourse`, …) list a bare `/v1/<endpoint>`. The PDF never states the body
  encoding; this app sends `application/x-www-form-urlencoded`, which is what the vendor's PHP
  library does. **That encoding is inferred from the library and was not exercised against a live
  account** — no TalentLMS account was available while building.

## Actions

| Resource | Action | Endpoint |
|---|---|---|
| user | `user-get` | `GET /v1/users/{id|email|username}:{value}` |
| user | `user-get-many` | `GET /v1/users/page_size:{…},page_number:{…}` |
| user | `user-create` | `POST /v1/usersignup` |
| user | `user-edit` | `POST /v1/edituser` |
| user | `user-delete` | `POST /v1/deleteuser` |
| user | `user-set-status` | `GET /v1/usersetstatus/user_id:{…},status:{…}` |
| user | `user-is-online` | `GET /v1/isuseronline/user_id:{…}` |
| user | `user-get-by-custom-field` | `GET /v1/getusersbycustomfield/custom_field_value:{…}` |
| user | `user-custom-fields-get` | `GET /v1/getcustomregistrationfields` |
| course | `course-get` | `GET /v1/courses/id:{…}` |
| course | `course-get-many` | `GET /v1/courses` |
| course | `course-create` | `POST /v1/createcourse` |
| course | `course-delete` | `POST /v1/deletecourse` |
| course | `course-enroll-user` | `POST /v1/addusertocourse` |
| course | `course-unenroll-user` | `GET /v1/removeuserfromcourse/user_id:{…},course_id:{…}` |
| course | `course-goto` | `GET /v1/gotocourse/user_id:{…},course_id:{…}` |
| course | `course-custom-fields-get` | `GET /v1/getcustomcoursefields` |
| course | `course-get-by-custom-field` | `GET /v1/getcoursesbycustomfield/custom_field_value:{…}` |
| course | `course-get-user-status` | `GET /v1/getuserstatusincourse/course_id:{…},user_id:{…}` |
| course | `course-reset-user-progress` | `GET /v1/resetuserprogress/course_id:{…},user_id:{…},remove_certification:{…}` |
| category | `category-get` | `GET /v1/categories/id:{…}` |
| category | `category-get-many` | `GET /v1/categories` |
| category | `category-get-leafs-and-courses` | `GET /v1/categoryleafsandcourses/id:{…}` |
| group | `group-get` | `GET /v1/groups/id:{…}` |
| group | `group-get-many` | `GET /v1/groups` |
| group | `group-create` | `POST /v1/creategroup` |
| group | `group-delete` | `POST /v1/deletegroup` |
| group | `group-add-user` | `GET /v1/addusertogroup/user_id:{…},group_key:{…}` |
| group | `group-remove-user` | `GET /v1/removeuserfromgroup/user_id:{…},group_id:{…}` |
| group | `group-add-course` | `GET /v1/addcoursetogroup/course_id:{…},group_id:{…}` |
| branch | `branch-get` | `GET /v1/branches/id:{…}` |
| branch | `branch-get-many` | `GET /v1/branches` |
| branch | `branch-create` | `POST /v1/createbranch` |
| branch | `branch-delete` | `POST /v1/deletebranch` |
| branch | `branch-add-user` | `GET /v1/addusertobranch/user_id:{…},branch_id:{…}` |
| branch | `branch-remove-user` | `GET /v1/removeuserfrombranch/user_id:{…},branch_id:{…}` |
| branch | `branch-add-course` | `GET /v1/addcoursetobranch/course_id:{…},branch_id:{…}` |
| branch | `branch-set-status` | `GET /v1/branchsetstatus/branch_id:{…},status:{…}` |
| unit | `unit-get-progress` | `GET /v1/getusersprogressinunits/unit_id:{…},user_id:{…}` |
| unit | `test-get-answers` | `GET /v1/gettestanswers/test_id:{…},user_id:{…}` |
| unit | `survey-get-answers` | `GET /v1/getsurveyanswers/survey_id:{…},user_id:{…}` |
| unit | `ilt-get-sessions` | `GET /v1/getiltsessions/ilt_id:{…}` |
| domain | `site-info-get` | `GET /v1/siteinfo` |
| domain | `rate-limit-get` | `GET /v1/ratelimit` |
| domain | `timeline-get` | `GET /v1/gettimeline/event_type:{…},user_id:{…},course_id:{…},branch_id:{…},group_id:{…},unit_id:{…}` |

## Things that cost a day

- **Everything is a string.** Ids, counts, points and flags come back as JSON strings
  (`"id":"7"`, `"status":"active"`), and dates are `DD/MM/YYYY, HH:MM:SS` in the account's format
  (see `siteinfo.date_format`). Responses are passed through untouched.
- **Mutations by GET, creates by POST.** See above — a retry-safe wrapper cannot assume the verb.
  Actions that mint something (`user-create`, `course-create`, `group-create`, `branch-create`,
  `course-goto`) declare `idempotent: false`; the rest converge on the same end state.
- **A nonexistent subdomain still answers.** An unauthenticated request to a made-up subdomain
  returns the same `401` HTML as a real one, so a "is this tenant's host reachable?" check
  cannot tell a renamed portal from a live one; this app declares no `domain` health check for
  that reason. A wrong subdomain shows up in the credential check instead.
- **Rate limits are per plan and per burst.** 2,000 requests/hour (Starter, Core, Basic) or
  10,000 (Grow, Pro, Plus, Premium), and never more than 200 calls per 5 seconds. The `quota`
  check reads `/v1/ratelimit` (unmetered).
- **Custom fields** are addressed `custom_field_N`. `customFields` accepts `{"3": "x"}` or
  `{"custom_field_3": "x"}`; checkboxes take `"on"` / `"off"`. Dates in a custom-field *search*
  must use dashes (`11-6-2019`), and a comma in the searched value is not supported.

## Health checks

| Check | Kind | What it does |
|---|---|---|
| `service` | service | **Declared absence**, informational. `status.talentlms.com` is a bespoke HTML page (34,686 bytes); every JSON, RSS and Atom path on it answers 404 and `talentlms.statuspage.io` redirects to statuspage.io's marketing root, so there is nothing machine-readable to read. |
| `quota` | quota | `GET /v1/ratelimit` (signed, unmetered): `degraded` under 10% headroom, `down` at zero, informational. |
| `auth:api-key` | credential | Derived from the Auth `test` hook. |

## Deliberately absent

- **User login / logout, forgot username, forgot password.** They take a learner's password or send
  email on a learner's behalf — end-user flows, not account administration.
- **The optional redirect arguments of `course-goto`** (`logout_redirect`, `course_completed_redirect`,
  `header_hidden_options`). The PDF says they must be base64-encoded outside its PHP library but
  never says how they sit in the path.
- **Branch e-commerce fields** on `branch-create` (processor, subscription, credits, PayPal): listed
  without value formats.
- **`output` schemas.** Responses are the vendor's loose, string-typed documents; the audit tool
  warns about this, and a schema would assert types the API does not keep.
