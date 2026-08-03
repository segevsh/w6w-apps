# Discourse

Topics, posts, categories, users, groups, private messages and search on a **Discourse** forum —
self-hosted or Discourse-hosted — over the **Discourse REST API**.

- **Categories** — communication, social-media
- **Auth methods** — api-key
- **Actions** — 26
- **Egress allowlist** — `*` (see below — the forum's host is the customer's own domain)
- **Website** — https://www.discourse.org/
- **Source** — https://github.com/discourse/discourse (GPL-2.0, Ruby on Rails + Ember)
- **API docs** — https://docs.discourse.org/

Discourse is open-source forum software. That single fact drives nearly every design decision in
this app: there is no `api.discourse.com`, no tenant subdomain scheme, and no vendor-controlled
host. A forum lives at whatever domain its community chose, and half the interesting failure modes
belong to the customer's own infrastructure rather than to a vendor.

> **The candidate link was correct.** `https://docs.discourse.org/` is the live API reference —
> unusually for this pack, it needed no correction. What it does *not* do is render for a fetcher:
> the page is a 653-byte ReDoc shell that loads its content from
> `https://docs.discourse.org/openapi.json`. Everything in this app was transcribed from that
> 705 KB OpenAPI 3.1 document (79 paths, 96 operations), fetched 2026-08-03, cross-checked against
> the Discourse source on GitHub where the document was ambiguous.

## The four things most likely to go wrong

### 1. There is no vendor host — the instance IS the host

Discourse's own OpenAPI document declares a single `servers` entry:

```jsonc
"servers": [{ "url": "https://{defaultHost}",
              "variables": { "defaultHost": { "default": "discourse.example.com" } } }]
```

That placeholder is the whole story. The manifest therefore declares `network.allow: ["*"]`,
following the sibling **`wordpress`** app and for exactly the same reason: the reachable host set is
the customer's own domain and cannot be enumerated in advance. Narrowing it to `*.discourse.org` /
`*.discourse.group` would break every self-hosted install, which is most of them.

The forum URL is an **Auth field**, not an Action param. It identifies the forum the credential
belongs to, so it belongs on the Connection. `afterConnect` normalises it (a bare hostname gets
`https://`, trailing paths and slashes are stripped) and republishes it as
`connection.display.siteUrl`; `lib/client.ts` reads it from there, so the client can address the
right host without ever seeing a credential. `tests/index.test.ts` asserts that **no action file
contains an absolute URL literal at all**.

### 2. Authentication is TWO headers, and neither is `Authorization`

From the API reference's own preamble:

> To become authenticated you will need to create an API Key from the admin panel. Once you have
> your API Key you can pass it in along with your API Username as an HTTP header like this:
>
> ```
> curl -X GET "http://127.0.0.1:3000/admin/users/list/active.json" \
> -H "Api-Key: 714552c6148e1617aeab526d0606184b94a80ec048fc09894ff1a72b740c5f19" \
> -H "Api-Username: system"
> ```

Verified against the server side too — `lib/auth/default_current_user_provider.rb` reads
`HTTP_API_KEY` and `HTTP_API_USERNAME` from the Rack env:

```ruby
HEADER_API_KEY      = "HTTP_API_KEY"
HEADER_API_USERNAME = "HTTP_API_USERNAME"
```

**Query-string and body authentication are gone.** Discourse dropped all non-header authentication
on 6 April 2020. The source retains an `api_parameter_allowed?` branch, off for ordinary requests.
This is a convenience for us: the credential never has to be interpolated into a URL, which is a
sandbox rule anyway.

#### Single User keys and All Users keys behave differently — verified in source

This was the hypothesis to check, and the answer is more specific than "user-scoped vs system keys
differ". `lookup_api_user` in the same file:

```ruby
user =
  if api_key.user
    api_key.user if !api_username || (api_key.user.username_lower == api_username.downcase)
  elsif api_username
    User.find_by(username_lower: api_username.downcase)
  elsif user_id = ... @env[HEADER_API_USER_ID] ...
```

| Key type | `Api-Username` | Behaviour |
| --- | --- | --- |
| **Single User** (`api_key.user` set) | optional | If sent, it **must** equal that key's own user, case-insensitively. Any other name fails authentication outright — it does not fall back to the bound user. |
| **All Users** (global) | effectively required | It selects the acting user. Without it (or `Api-User-Id` / `Api-User-External-Id`) there is no user and the request is rejected. |

So `Api-Username` is half of "which principal is this", exactly like the username in Basic auth. It
is a **credential field**, not an action param: an action-level knob would put credential-adjacent
material in the network-capable worker, let two actions on one Connection disagree about who they
are, and — for a Single User key — offer a field whose only correct setting is a value the workflow
author cannot see. `tests/index.test.ts` asserts no action declares it under any spelling.

It is marked required (defaulting to `system`, Discourse's built-in automation account) even though
a Single User key would work without it, because the two failure modes are asymmetric: sending the
correct username is always fine, while omitting it on a global key produces a bare 403 that looks
exactly like a bad key.

It is a plain `string`, not a `secret` — a forum username is public, and masking it would make a
typo impossible to spot. The key beside it is masked.

#### The other Discourse credential, deliberately not shipped

Discourse has a **second, unrelated** credential: the **User API key** (`User-Api-Key` header,
`PARAMETER_USER_API_KEY` in the same provider). It is a per-user, scoped key minted through a
browser handshake with an RSA public key, so a mobile app can obtain access without an admin issuing
anything. It is a genuinely separate spec, and it needs an interactive registration flow an
unattended workflow cannot complete. `tests/index.test.ts` bans the header name from action code so
nobody improvises it.

### 3. `.json` is part of the path, not content negotiation

The API reference opens with this, and it is the shape of every route in the app:

> the URL `/categories` serves a list of categories, the `/categories.json` API provides the same
> information in JSON format… Sending requests with the `Accept` header is necessary if you want to
> use URLs for related endpoints returned by the API, such as pagination URLs. These URLs are
> returned without the `.json` prefix.

So every path here carries the suffix, **and** `accept: application/json` is sent — because
`more_topics_url` and friends come back without the suffix, and a caller following one needs the
header.

### 4. Two endpoints take a "boolean" that is actually a quoted string

The reference states the rule and its exception in the same document. The rule:

> If an endpoint accepts a boolean be sure to specify it as a lowercase `true` or `false` value
> unless noted otherwise.

The exceptions, from the endpoint schemas themselves:

| Endpoint | Field | Declared type |
| --- | --- | --- |
| `PUT /t/{id}/status.json` | `enabled` | `string`, `enum: ["true", "false"]` |
| `GET /latest.json` | `ascending` | `string` — "add `ascending=true` to sort asc" |
| `GET /admin/users/list/{flag}.json` | `asc` | `string`, `enum: ["true"]` |
| `GET /categories.json` | `include_subcategories` | `boolean`, `enum: [true]` — only its presence means anything |

Meanwhile `POST /posts.json`'s `auto_track` and `PUT /posts/{id}.json`'s `bypass_bump` really are
JSON booleans. `lib/client.ts` exposes `boolString()` so the string cases say what they mean, and
the unit tests pin the literal wire bytes (`"enabled":"true"`, not `"enabled":true`) rather than
trusting `JSON.stringify` to coincidentally produce the right token. The two `enum: [true]` /
`enum: ["true"]` cases are sent **by presence** — a `false` on a parameter whose only legal value is
`true` is undefined behaviour, and might well be read as truthy.

## Other conventions this app encodes

**One endpoint, three actions.** `POST /posts.json` creates a topic, a reply *or* a private message
— Discourse's own summary is "Creates a new topic, a new post, or a private message". Which one you
get is decided by the body: `title` without `topic_id` → topic; `topic_id` → reply; `archetype:
private_message` + `target_recipients` → PM. They are shipped as three actions (`topic-create`,
`post-create`, `message-create`) because the required fields differ, and one form whose
requirements change under you is the classic way to ship a 422. Each action's test asserts the
*absence* of the field that would flip it into a different mode.

**Comma-separated strings, not arrays.** `usernames` on both group-membership routes is typed
`string` with the example `username1,username2`; `target_recipients` likewise ("Required for private
message, comma separated", example `blake,sam`). Sending a JSON array is a silent no-op on some
Discourse versions. `csvString()` builds the exact wire form once, and the tests assert
`typeof body.usernames === "string"`.

**A DELETE with a request body.** `DELETE /groups/{id}/members.json` carries `usernames` in its
body. Some HTTP clients quietly drop a body on DELETE, which would turn the call into one that
removes nobody and still answers 200. `tests/lib/client.test.ts` pins that it survives.

**`PUT /t/-/{id}.json` — the `-` is literal.** Discourse's topic routes are `/t/{slug}/{id}`, and
the update route documents `-` as the stand-in for an unknown slug. It is hard-coded rather than
parameterised: there is no value a caller would want there instead. `GET /c/{slug}/{id}.json` is
*not* documented as accepting the same substitution, so `category-topic-list` asks for both halves.

**Public routes are name-keyed; admin routes are id-keyed.** `GET /u/{username}.json` and
`GET /groups/{name}.json` take names; `PUT /admin/users/{id}/suspend.json` and
`PUT /groups/{id}/members.json` take numeric ids. That split is Discourse's, not an inconsistency
introduced here — `user-get` and `group-get` are how a workflow turns a name into the id the write
actions need.

**Envelopes are inconsistent, per endpoint.** `GET /posts/{id}.json` returns the post bare;
`PUT /posts/{id}.json` on the *same path* wraps it in `{ "post": … }`. `GET /u/{username}.json` and
`GET /groups/{name}.json` envelope under `user` / `group`. Each action unwraps only where the
endpoint actually envelopes, and passes an unenveloped response through unchanged — both branches
are tested.

**Two side effects the API mentions in passing, surfaced in the form.** `show_emails` on the admin
user list: "These requests will be logged in the staff action logs." And `message` on user suspend:
"Will send an email with this message when present" — so a blank field must never become an
empty-string message, which `unset()` guarantees and the test pins. Emailing a community member by
accident is not a recoverable mistake.

**`active` on user create silently does nothing without an admin key.** The reference: "This param
requires an admin api key in the request header or it will be ignored." A non-admin key does not
fail — it creates an unconfirmed account, which looks identical to success. The hint says so.

## Actions

### Topics

| Action | Endpoint | Notes |
| --- | --- | --- |
| `topic-create` | `POST /posts.json` | `title` + `raw`, no `topic_id`. Category is `category` (an integer), not `category_id` |
| `topic-get` | `GET /t/{id}.json` | Returns the topic **and** the first page of posts as `post_stream` |
| `topic-update` | `PUT /t/-/{id}.json` | Body nests under `topic`. Only `title` + `category_id` are published |
| `topic-delete` | `DELETE /t/{id}.json` | Soft delete — staff keep a restorable copy |
| `topic-list-latest` | `GET /latest.json` | `per_page` capped at 100 by the vendor; page via `more_topics_url` |
| `topic-set-status` | `PUT /t/{id}/status.json` | Five statuses; `enabled` is a quoted string |

### Posts

| Action | Endpoint | Notes |
| --- | --- | --- |
| `post-create` | `POST /posts.json` | `topic_id` set, no `title`. `reply_to_post_number` is a post *number*, not an id |
| `post-get` | `GET /posts/{id}.json` | Unenveloped |
| `post-update` | `PUT /posts/{id}.json` | Full replacement of `raw`; `bypass_bump` sits outside the `post` object |
| `post-delete` | `DELETE /posts/{id}.json` | `force_destroy` is the second half of a two-step purge — see below |
| `post-like` | `POST /post_actions.json` | `post_action_type_id: 2`, a constant — see below |

`post-delete`'s `force_destroy` is exposed but the protocol around it is **not** implemented: the
reference requires the forum's `can_permanently_delete` setting, and "this endpoint needs to be
called first without `force_destroy` and then followed up with a second call 5 minutes later".
Sleeping five minutes inside an action would burn a worker and still be the wrong shape — a workflow
with a delay step between two invocations expresses it properly and is auditable.

`post-like` hard-codes the type id. The endpoint is generic, but the reference documents exactly one
value ("e.g., 2 for like") and the flag type ids are not published in the API reference at all.
Exposing the raw integer would offer a field where every value but one is an undocumented guess, and
a wrong guess silently files a moderation flag against a community member instead of liking their
post.

### Categories

| Action | Endpoint | Notes |
| --- | --- | --- |
| `category-list` | `GET /categories.json` | The lookup table for every numeric category id |
| `category-create` | `POST /categories.json` | Colours are bare six-digit hex — a `#` prefix is a silent 422, rejected in the form |
| `category-topic-list` | `GET /c/{slug}/{id}.json` | Both path segments required |

### Users

| Action | Endpoint | Notes |
| --- | --- | --- |
| `user-get` | `GET /u/{username}.json` | Name-keyed |
| `user-create` | `POST /users.json` | All four of name/email/username/password required — no invite mode here |
| `user-update` | `PUT /u/{username}.json` | Only `name` + `external_ids` are published; nothing else is guessed at |
| `user-list` | `GET /admin/users/list/{flag}.json` | Flag is a path segment, one of six. Admin-scoped |
| `user-suspend` | `PUT /admin/users/{id}/suspend.json` | Id-keyed. Both `suspend_until` and `reason` required |

### Groups

| Action | Endpoint | Notes |
| --- | --- | --- |
| `group-list` | `GET /groups.json` | No parameters — the reference documents none, so none are invented |
| `group-get` | `GET /groups/{name}.json` | Name-keyed; returns the id the membership routes need |
| `group-add-members` | `PUT /groups/{id}/members.json` | PUT *adds*, it does not replace |
| `group-remove-members` | `DELETE /groups/{id}/members.json` | A DELETE with a body |

### Search, messages and site

| Action | Endpoint | Notes |
| --- | --- | --- |
| `search` | `GET /search.json` | Two params: `q` and `page`. The filter grammar lives inside `q` |
| `message-create` | `POST /posts.json` | `archetype: private_message` + `target_recipients` |
| `site-info-get` | `GET /site.json` | The enum tables (`trust_levels`, `post_action_types`, `archetypes`, `notification_types`) the rest of the API returns as bare integers |

`search` offers one text field rather than a dozen filter params because Discourse's search filters
*are* the query string: `@user`, `#category`, `tags:a,b` (`a+b` for all), `before:`/`after:`,
`order:`, `in:`, `with:`, `status:`, `group:`, `min_posts:`/`max_posts:`,
`min_views:`/`max_views:`. Exploding them into params would only reassemble the same string, and
would drift the moment Discourse adds a prefix. The full vocabulary is reproduced in the action's
hint and in its source comment.

### Not implemented

Real endpoints deliberately left out of this first version, so their absence is a decision rather
than an oversight:

- **Tags** — `tags` does not appear in the published request schema for `POST /posts.json` or
  `PUT /t/-/{id}.json`, and both schemas set `additionalProperties: false`. Discourse accepts tags on
  those routes in practice, but shipping an undocumented field name is how an action starts silently
  discarding input. `GET /tags.json` and the tag-group CRUD are omitted for symmetry — read-only tags
  with no way to write them is a half-feature.
- **Invites** — `POST /invites.json`, `/invites/create-multiple.json`, `POST /t/{id}/invite.json`,
  `/invite-group.json`.
- **Uploads** — `POST /uploads.json` plus the six-endpoint presigned/multipart external upload dance.
- **Flagging** — the non-like `post_action_type_id` values, for the reason given above.
- **Badges**, **backups**, **notifications**, **private-message listing**, **topic timers**,
  **bookmarks**, **notification levels**, **change-timestamp**, **avatar/email/username preference
  changes** (each triggers its own confirmation flow), **anonymize / activate / deactivate / silence
  / log-out** admin actions, **password reset**, **user badges**, **directory items**,
  **user actions**, and the **Discourse Calendar** plugin endpoints.
- **The User API key auth method** — needs an interactive browser handshake (see above).

## Health checks

Three declared, one derived. Two probe; one declares an absence.

### `service` — Discourse hosting status · **informational**, deliberately

Discourse's status page is at **`status.discourse.org`**, and it is **not** an Atlassian Statuspage
— which is the first habit that would go wrong here.

#### Verifying the endpoint is real, two ways

Both run on 2026-08-03, per the rule that a JSON-shaped path returning 200 proves nothing.

**(a) Deliberately bogus siblings on the same host.** First, ruling out the Statuspage assumption:

| URL | Result |
| --- | --- |
| `https://status.discourse.org/` | 200, `text/html`, 103,288 B |
| `https://status.discourse.org/api/v2/summary.json` | **404**, `text/html`, 427 B |
| `https://status.discourse.org/api/v2/status.json` | **404**, `text/html`, 427 B |
| `https://status.discourse.org/api/v2/notareal.json` | 404, same 427 B |
| `https://status.discourse.com/` | does not resolve (DNS) |
| `https://discourse.statuspage.io/` | 200 — **after redirecting to `https://www.atlassian.com/software/statuspage`**, 127,720 B of marketing HTML |

That last row is the known trap, hit exactly as documented: an unclaimed `*.statuspage.io`
subdomain serving Atlassian's own product page, which would sail through a naive "did it 200?" test
while containing nothing about Discourse. It is not used.

The real page is **Status.io**. Its HTML loads its favicon from `image.status.io`, and the response
carries `x-status-page-id: 5e2141ce30dc5c04b3ac32fc`. Status.io serves that page id unauthenticated
at `https://api.status.io/1.0/status/{id}` — which passes the same bogus-sibling test:

| Path | Result |
| --- | --- |
| `/1.0/status/5e2141ce30dc5c04b3ac32fc` | 200, `application/json`, 6,219 B — the real tree |
| `/1.0/status/deadbeefdeadbeefdeadbeef` | 200, **`{"error":"status page not found"}`** |
| `/1.0/notareal/5e2141ce30dc5c04b3ac32fc` | **403**, `{"message":"Missing Authentication Token"}` |
| `/1.0/incidents/5e2141ce30dc5c04b3ac32fc` | **403**, same |

Three different answers across four requests, and the bogus page id is rejected **by id** — no
static catch-all could do that.

**(b) Content-type and body inspection.** `application/json`, and the payload names Discourse's
actual product lines and hosting regions:

```jsonc
{"result":{"status_overall":{"status":"Operational","status_code":100},
 "status":[{"name":"Discourse Starter, Basic, Pro, and Business Hosting","status_code":100,
            "containers":[{"name":"NA West (sea) 1"},{"name":"NA East (yyz) 1"},
                          {"name":"EU (dub) 1"}, …]},
           {"name":"Discourse Enterprise Hosting"},{"name":"Website"},
           {"name":"Internal Services"},{"name":"Discourse ID"},{"name":"Meta"}],
 "incidents":[],"maintenance":{"active":[],"upcoming":[]}}}
```

Six named components with seven regional containers — an account-specific set no HTML catch-all
could fabricate.

The status vocabulary is read from `status_code`, not from the display string, because the code is
the stable half: Status.io lets a page operator rename the labels, and Discourse has renamed 200 to
"Planned Maintenance". Codes per <https://kb.status.io/developers/status-codes/>: 100 Operational,
200 Maintenance, 300 Degraded Performance, 400 Partial Service Disruption, 500 Service Disruption,
600 Security Event.

The check also guards Status.io's **200-with-error** shape: an unknown page id answers HTTP 200 with
`{"error":"status page not found"}`. A check trusting the status code alone would report `ok`
forever.

#### Why `informational` rather than the `degraded` default

`status.discourse.org` reports Discourse's **hosting business**. A self-hosted forum — which is most
Discourse installs, since the product is open source and designed to be run by its community — is
completely unaffected by every component on that page. This check is `scope: "app"`, so it cannot
know which Connections are Discourse-hosted and which are a box in a data centre.

At the `degraded` default, a wobble in Discourse Cloud's Dublin region would pin every self-hosted
tenant's App at `degraded`. That would be a plain untruth about their forum.

Nothing is lost by the downgrade, and that is the load-bearing part of the argument: every
Connection already has a **strictly better** signal for its own forum in the `site` check below,
which probes that forum's actual host, per Connection, at `degraded` severity. If a Discourse-hosted
forum goes down, `site` reports it directly rather than by inference from a fleet-wide page.

`api.status.io` is declared in the check's own `network.allow` and is `credential: "none"` — a
third-party status host must never see a forum's API key. That declaration is technically redundant
while the app allowlist is `["*"]`; it is written out so the intent survives if the allowlist is ever
narrowed, and so a manifest reader can see that this hook — and only this hook — talks to Status.io.

### `site` — is this connection's forum reachable? · `kind: "dependency"`, `credential: "context"`

Not `service`: for a self-hosted forum there is no vendor platform to be up or down, the forum *is*
the dependency, and its availability is a property of the customer's own infrastructure.
`scope: "connection"` because every Connection points at a different forum. `credential: "context"`
because the check needs the Connection to know *which* host to call and needs no credential to
interpret the answer — `sign` must not run. The test asserts no credential header appears on the
request.

The probe is **`GET /site/basic-info.json`**, and the choice over the obvious alternatives is the
point:

| Candidate | Why not |
| --- | --- |
| `/site.json` | Rendered through the request's `guardian`, so a `login_required` forum answers 403 to anonymous callers. A perfectly healthy private forum would report broken |
| `/categories.json`, `/latest.json` | Same login-gate problem, plus they are real database queries — far more expensive than a liveness probe should be |
| `/srv/status` | Discourse's load-balancer liveness route. It works (verified: 200, `text/plain`, the two bytes `ok`) but proves only that Rails is answering — no identity, nothing about whether the JSON API is served, and commonly rewritten or blocked at the reverse proxy on self-hosted installs, so a 404 there is ambiguous between "forum down" and "ops locked the path" |

`/site/basic-info.json` is the one endpoint Discourse **explicitly exempts from the login gate**.
From `app/controllers/site_controller.rb`:

```ruby
skip_before_action :redirect_to_login_if_required,
                   :redirect_to_profile_if_required,
                   only: %w[basic_info statistics]
…
# this info is always available cause it can be scraped from a 404 page
```

It returns the forum's `title`, `description`, logo URLs, `locale` and `login_required` — enough to
prove the host resolves, that Discourse is what is answering, and that the JSON API is being served.
Verified live 2026-08-03 against `https://meta.discourse.org/site/basic-info.json`: 200,
`application/json; charset=utf-8`, 873 B, `x-discourse-route: site/basic_info`.

The forum's `title` is echoed into the report, because the commonest real failure here is a
Connection pointed at the *wrong* site — which a bare "ok" would hide. A 200 whose body is not
Discourse's payload (a parked page, a captive portal, a proxy error page) reports `degraded`, not
`ok`.

### `quota` — declared `unavailable`

Discourse rate-limits per instance, and publishes no way to read remaining headroom, so this
declares an absence with a reason rather than pretending to probe. Verified two ways:

1. **The source names exactly two rate-limit headers, and sets both only on the rejection.**
   `lib/middleware/request_tracker.rb` builds `"Retry-After" => available_in.to_s` and
   `"Discourse-Rate-Limit-Error-Code" => error_code` inside the 429 branch. No `RateLimit-*` or
   `X-RateLimit-*` header exists on a successful response.
2. **A live request confirms it.** `GET https://meta.discourse.org/site/basic-info.json` on
   2026-08-03 returned `server`, `date`, `content-type`, `vary`, `x-frame-options`,
   `x-xss-protection`, `x-content-type-options`, `x-permitted-cross-domain-policies`,
   `referrer-policy`, `x-discourse-route`, `cache-control`, `x-request-id`, `cdck-proxy-id`,
   `strict-transport-security` — no allowance header among them.

The limits themselves are site settings the forum's own admin controls
(`max_reqs_per_ip_per_minute`, `max_reqs_per_ip_per_10_seconds`, `max_admin_api_reqs_per_minute`),
so the allowance is not even constant across forums. The nearest readable number is
`GET /admin/site_settings.json`, which returns the *configured limit* — the denominator, never the
remainder — and needs an admin-scoped key a correctly-scoped integration should not have. Reporting
a limit as if it were headroom is worse than reporting nothing.

`severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in the roll-up, so at any other severity a declared absence would pin the App
at `unknown` forever. `tests/index.test.ts` enforces this for *every* `unavailable` entry, not just
this one.

### `auth:api-key` — derived, free

The runtime derives a credential check from the Auth `test` hook, which probes
`GET /u/{apiUsername}.json` — the user record of the account the key acts as. That is the right
liveness probe because it is exactly the identity the credential claims, and it separates three
failures a content-collection probe would conflate:

- **403** — bad or revoked key, or (for a Single User key) the wrong username. Note Discourse answers
  **403, not 401**, for a rejected API key; treating only 401 as a credential failure would misreport
  every one of them as an outage. Both are handled.
- **404** — the key authenticated but the username does not exist: a typo in the username field, not
  a bad key.
- **transport failure** — wrong forum URL or the site is down, which `site` reports separately.

Probing `/latest.json` or `/categories.json` instead would report a working credential as broken
whenever the key's scopes or the user's trust level restrict category access — and a
correctly-scoped key routinely cannot read everything.

## Icon

`assets/icon.svg` is **Discourse's own mark**, downloaded from the vendor's brand page and stored
byte-for-byte:

```
https://www.discourse.org/a/img/brand-kit/logos/discourse-icon.svg
```

2,301 bytes, `image/svg+xml`, MD5 `1321605b9b99f401e8e6b2803c0edeec`, verified with `diff` against a
second fetch of the live URL on 2026-08-03. It is the light-background variant; Discourse also
publishes `discourse-icon-dark.svg` at the same path prefix.

## Development

```sh
cd apps/discourse
deno task test    # 155 unit tests
deno task check
deno task lint
deno task fmt     # NOT bare `deno fmt` — that rewrites assets/icon.svg
```

Tests use a mocked `HookContext` (`tests/_helpers.ts`) — no network, no server. Beyond per-action
coverage, `tests/index.test.ts` enforces the sandbox rules in source: no action may reference a
credential, build `Api-Key` / `Api-Username` / `User-Api-Key` itself, call global `fetch`, touch
`Deno.*`, contain an absolute URL literal, or declare the connection's identity as a parameter — and
a self-test proves the comment stripper those guards depend on still strips.

## Links

Every URL below was verified on 2026-08-03 by fetching it and inspecting the response body, not by
checking for a 200.

- **Vendor site** — https://www.discourse.org/
- **Source repository** — https://github.com/discourse/discourse (GPL-2.0; Ruby on Rails backend,
  Ember frontend). Discourse is genuinely open source, which is why `network.allow` is `*`
- **API docs** — https://docs.discourse.org/ (a ReDoc shell; the content is the OpenAPI document
  below)
- **OpenAPI document** — https://docs.discourse.org/openapi.json — 705 KB, OpenAPI 3.1, 79 paths.
  The authoritative source for every path, parameter and enum in this app
- **Meta / community** — https://meta.discourse.org/ (itself a Discourse instance, and the live
  forum every wire check in this README was run against)
- **Reverse-engineering guide** — https://meta.discourse.org/t/-/20576 — the reference's own advice
  for endpoints it does not document. Cited here as the reason the "not implemented" list is honest
  rather than exhaustive: undocumented endpoints exist, and are not shipped
- **Brand assets** — https://www.discourse.org/brand
- **Status page** — https://status.discourse.org/ (Status.io) · API:
  `https://api.status.io/1.0/status/5e2141ce30dc5c04b3ac32fc`
- **Status.io status codes** — https://kb.status.io/developers/status-codes/
- **Auth provider source** — https://github.com/discourse/discourse/blob/main/lib/auth/default_current_user_provider.rb
  — the ground truth for `Api-Key` / `Api-Username` and the Single-User-vs-All-Users behaviour
- **Rate limiter source** — https://github.com/discourse/discourse/blob/main/lib/middleware/request_tracker.rb
  — the ground truth for "no readable headroom"
