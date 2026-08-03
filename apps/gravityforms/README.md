# Gravity Forms

Read forms, search and manage entries, and run real form submissions on a **self-hosted** Gravity
Forms site, through the WordPress REST API.

- **Id:** `io.w6w.gravityforms` · **Categories:** `forms`, `productivity`
- **Auth:** `basic` (HTTP Basic — WordPress Application Password or Gravity Forms consumer
  key/secret)
- **Actions:** 12 · **Health checks:** `service`, `quota`, `site`

Everything below was verified against the vendor's own documentation on 2026-08-03; the pages used
are listed under [Links](#links). No endpoint, parameter or response key here was written from
memory.

## The self-hosted model — read this first

Gravity Forms is a **WordPress plugin**, not a SaaS. It registers a namespace on the site's own
WordPress REST API, so there is no shared vendor host and no shared credential. Every call this App
makes goes to the customer's own server:

```
https://{their-site}/wp-json/gf/v2/...
```

Three consequences shape the whole App:

1. **The base URL is per-Connection.** The site URL is collected once as an Auth field, published
   onto the Connection's redacted display data by `afterConnect`, and turned into a base URL in
   `lib/client.ts`. Actions read it from `ctx.connection.display` — they never see the credential.

2. **Subdirectory installs are first-class.** A WordPress install at `https://site.com/blog` puts
   the API at `https://site.com/blog/wp-json/gf/v2`. `normalizeSiteUrl()` preserves that path,
   strips trailing slashes, and tolerates a URL pasted with `/wp-json` or `/wp-json/gf/v2` already
   on the end (so the route is never doubled). This is the easiest thing to get silently wrong, so
   it is covered directly in `tests/lib/client.test.ts`.

3. **Egress cannot be allow-listed.** The manifest declares `network.allow: ["*"]` — the same
   posture the `wordpress` and `ghost` apps in this pack take, and the one the spec names for "the
   endpoint is a user-supplied URL (a self-hosted install)". There is no narrower form that works
   when the host belongs to the customer.

## Auth — why Basic, and why not OAuth 1.0a

The vendor's authentication page documents three ways in:

| Method                           | What the vendor says                                                                                                                                                                                                                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OAuth 1.0a**                   | "the recommended authentication method as it offers a higher level of security"; uses a Gravity Forms consumer key/secret and HMAC request signing                                                                                                                                     |
| **Basic**                        | "supported **only over HTTPS**. For non-HTTPS (HTTP) requests, use **OAuth 1.0a**"; username = consumer key, password = consumer secret                                                                                                                                                |
| **Any WordPress authentication** | cookie auth, auth plugins, and **WordPress Application Passwords** — the page's own troubleshooting log excerpts show `GF_REST_Authentication::perform_application_password_authentication()` running, and name "Successful Basic Authentication using WordPress Application Password" |

This App implements **Basic only**, and that is a deliberate call:

- OAuth 1.0a's stated advantage over Basic is that it works on plain HTTP. Every request this App
  makes goes out over HTTPS, so the advantage does not apply.
- Implementing it means HMAC-SHA1 signing with OAuth's parameter normalisation — percent-encode,
  sort, re-join, build a signature base string — inside a network-less `sign` hook, against a
  per-site host whose reverse proxy may rewrite the very URL being signed. That is a large, brittle
  surface for no security gain over Basic-over-TLS.

Both credential kinds are HTTP Basic on the wire, so the single `basic` method accepts either:

- **WordPress Application Password** (recommended) — Users → Profile → Application Passwords.
  Username is the WordPress username. Honours that user's Gravity Forms capabilities.
- **Gravity Forms consumer key/secret** — Forms → Settings → REST API. Username is the consumer key,
  password the consumer secret.

Connect-time fields: **WordPress Site URL**, **Username or Consumer Key**, **Application Password or
Consumer Secret**.

`test` probes `GET /gf/v2/forms` — the cheapest authenticated read the API offers. There is no
unauthenticated ping to use instead: every `gf/v2` route is capability-gated. Reaching this one
proves four things a transport check would conflate — the site resolves, the WordPress REST API is
on, Gravity Forms REST API v2 is enabled at Forms → Settings → REST API, and the credential is live.
A 404 is reported with that last cause named, because it is the common setup mistake.

> **HTTPS is required.** Gravity Forms rejects Basic auth over plain HTTP.
>
> **The REST API is off by default.** Enable it at Forms → Settings → REST API.

## Actions

| Key                        | Type    | Endpoint                                    | Notes                                                                                 |
| -------------------------- | ------- | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| `form-get-many`            | search  | `GET /forms`                                | Summary listing keyed by form ID; pass Form IDs (`include`) for complete form objects |
| `form-get`                 | read    | `GET /forms/{id}`                           | The full Form Object — this is where field IDs and input names come from              |
| `form-field-filters-get`   | read    | `GET /forms/{id}/field-filters`             | The keys and operators a form's entry search accepts                                  |
| `form-results-get`         | read    | `GET /forms/{id}/results`                   | Aggregates for Quiz / Poll / Survey add-on forms                                      |
| `form-submit`              | perform | `POST /forms/{id}/submissions`              | **Full submission pipeline** — see below                                              |
| `form-validate`            | perform | `POST /forms/{id}/submissions/validation`   | Dry run: validation only, creates nothing                                             |
| `entry-get-many`           | search  | `GET /entries` or `GET /forms/{id}/entries` | Picks the scoped route when one Form ID is given                                      |
| `entry-get`                | read    | `GET /entries/{id}`                         | Flat object: metadata plus values keyed by field ID                                   |
| `entry-create`             | perform | `POST /forms/{id}/entries`                  | **Writes a row only** — see below                                                     |
| `entry-update`             | perform | `PUT /entries/{id}`                         | Replace, not patch — omitted values are blanked out                                   |
| `entry-delete`             | perform | `DELETE /entries/{id}`                      | Trash by default; `force` permanently deletes                                         |
| `entry-notifications-send` | perform | `POST /entries/{id}/notifications`          | Process an entry's notifications                                                      |

### Submit Form vs Create Entry — the distinction that matters

These are two different endpoints with two different meanings, and picking the wrong one is the most
common way an integration goes subtly wrong.

**`form-submit`** (`POST /forms/{id}/submissions`) puts values "through the **complete form
submission process**", which the vendor enumerates as validation, "configured anti-spam checks e.g.
honeypot, captcha, Akismet etc.", add-on feeds, notifications, confirmations, and "all the filters
and action hooks triggered by a regular form submission". Use it when the submission should behave
as if a human filled the form in: charge the card, fire the Mailchimp feed, send the notification.

**`entry-create`** (`POST /forms/{id}/entries`) does **none** of that. It writes the database row.
Use it for imports and back-fills, where firing a payment feed or emailing a customer would be
wrong. `entry-notifications-send` is offered separately so an import can still notify per entry when
it wants to.

They also **address values differently**, which is worth stating plainly:

| Action                          | Keyed by                             | Example                                                |
| ------------------------------- | ------------------------------------ | ------------------------------------------------------ |
| `form-submit` / `form-validate` | field **input name**                 | `{"input_1_3": "Neil", "input_3": "neil@example.com"}` |
| `entry-create`                  | field **ID** (dotted for sub-inputs) | `{"1.3": "Neil", "3": "neil@example.com"}`             |

`form-get` returns both.

Two more behaviours worth knowing:

- **A validation failure is a 200.** `form-submit` and `form-validate` answer `is_valid: false` with
  `validation_messages` rather than an error status. Check `is_valid` before treating a run as
  successful.
- **`entry-update` is a replace.** The vendor: "There are no required properties, but values not
  provided WILL BE BLANKED OUT." That is why the action takes one complete Entry Object instead of a
  field-by-field form — a partial parameter set would look like a patch and quietly wipe everything
  it omitted. Fetch with `entry-get`, edit, send the whole thing back.

### Query encoding

Gravity Forms reads its list parameters as PHP arrays, so `lib/client.ts` puts them on the wire in
bracket form and indexes lists — the vendor's own authentication page calls out that "array
parameters must be indexed correctly":

```
paging[page_size]=20&paging[current_page]=2&paging[offset]=40
sorting[key]=date_created&sorting[direction]=ASC&sorting[is_numeric]=false
form_ids[0]=1&form_ids[1]=2
search={"field_filters":[{"key":2,"value":"test","operator":"contains"}]}
```

`search` is documented as a JSON blob in the query string and is serialised that way. `_labels` and
`force` are documented 0/1 integers and are only sent when true, so the vendor's own defaults apply
otherwise.

### Not implemented, and why

Real endpoints this App deliberately leaves out — listed so the omission is a decision rather than a
gap:

- `POST /forms`, `PUT /forms/{id}`, `DELETE /forms/{id}` — form **authoring** over REST. All three
  require the entire Form Object, which is a large nested schema better edited in the WordPress
  admin than assembled in a workflow parameter. Add them if a real use case turns up.
- `GET|POST|PUT|PATCH|DELETE /feeds` and `/forms/{id}/feeds` — add-on feed **management**. Feeds are
  configuration; `form-submit` already runs them. Managing add-on configuration from a workflow is a
  different product decision from using the forms.
- **Entry notes.** There is no documented `notes` endpoint in REST API v2. Nothing was invented to
  fill the gap.

## Health checks

| Key       | Kind       | Scope      | Credential | Verdict                           |
| --------- | ---------- | ---------- | ---------- | --------------------------------- |
| `service` | service    | app        | none       | **`unavailable`** (informational) |
| `quota`   | quota      | connection | signed     | **`unavailable`** (informational) |
| `site`    | dependency | connection | `context`  | live probe                        |

**`service` — declared unavailable, honestly.** There is no vendor platform in the request path.
Gravity Forms is a plugin the customer installs on their own site, so nothing Rocketgenius operates
sits between a workflow and its data. `gravityforms.com` exists — it sells licences, serves plugin
updates and hosts the docs — but its uptime is not this App's uptime, and pointing a `service` check
at it would report a marketing site's availability as if it were the API's. That would be worse than
no check. `severity: "informational"` is load-bearing: an `unavailable` entry always reports
`unknown`, and `unknown` outranks `ok` in the roll-up, so at any other severity a declared absence
would pin every verdict at `unknown` forever.

**`quota` — declared unavailable.** Gravity Forms REST API v2 rides on the site's own WordPress REST
API. Neither documents a rate limit nor returns usage headers a probe could read; the only ceiling
is whatever the customer's web host, PHP configuration or security plugin imposes, and none of those
publish a number. Declared rather than omitted so a host can tell "we cannot know" from "nobody
looked".

**`site` — the check that actually answers "is this working?"** It probes the unauthenticated
WordPress discovery document, `GET {site}/wp-json/`, and is `credential: "context"`: it needs the
Connection to know _which_ host to call, and no credential to interpret the answer, so `sign` never
runs. It widens no egress — the site is already reachable under the app's own allowlist.

It is deliberately not pointed at a `gf/v2` route, because every one of those is capability-gated
and an authenticated probe would conflate "the site is down" with "this credential lacks a
capability". The discovery document separates three failures instead:

1. transport failure or 5xx → the site is gone or broken (`down`)
2. 401 / 403 / 404 on the REST root → the WordPress REST API is disabled or a security plugin is
   blocking it (`down`)
3. 200, but `namespaces` does not list `gf/v2` → WordPress is fine, but the Gravity Forms REST API
   v2 is switched off at Forms → Settings → REST API (`degraded`, with that instruction in the
   message)

(3) is the interesting one: it is the most common setup mistake for this App and is completely
invisible to a plain reachability check. `namespaces` is treated as advisory rather than
authoritative — a site can legitimately filter it — so its _absence_ reports `ok`, and only a
present-but-missing entry reports `degraded`.

The credential check comes free: the runtime derives an `auth:basic` check from the Auth `test`
hook, which is what reports a password that has stopped working. `site` exists to tell that apart
from a site that has gone away.

## Development

```sh
cd apps/gravityforms
deno task test    # 136 unit tests
deno task check
deno task lint
deno task fmt
```

Tests call every hook with a mocked `HookContext` (`tests/_helpers.ts`) — a queued fake `ctx.fetch`
and a no-op `ctx.log`. No network, no server.

## Icon

`assets/icon.svg` is the vendor's own mark, lifted from the inline `gravity-logo` SVG in the header
of `https://www.gravityforms.com/` (fetched 2026-08-03) with the wordmark paths removed and the
badge cropped to its own viewBox. Brand orange is `#F15A2B`, as published there.

## Links

Only URLs verified on 2026-08-03 are listed.

- **Vendor:** <https://www.gravityforms.com/>
- **REST API v2 guide (entry point for every endpoint page used here):**
  <https://docs.gravityforms.com/rest-api-v2/>
- **Authentication:** <https://docs.gravityforms.com/rest-api-v2-authentication/>
- **Endpoint pages used:**
  - <https://docs.gravityforms.com/getting-forms-with-the-rest-api-v2/>
  - <https://docs.gravityforms.com/submitting-forms-with-rest-api-v2/>
  - <https://docs.gravityforms.com/validating-forms-with-rest-api-v2/>
  - <https://docs.gravityforms.com/getting-the-form-field-filters-with-rest-api-v2/>
  - <https://docs.gravityforms.com/getting-results-with-rest-api-v2/>
  - <https://docs.gravityforms.com/creating-entries-with-the-rest-api-v2/>
  - <https://docs.gravityforms.com/searching-and-getting-entries-with-the-rest-api-v2/>
  - <https://docs.gravityforms.com/updating-entries-with-the-rest-api-v2/>
  - <https://docs.gravityforms.com/deleting-entries-with-the-rest-api-v2/>
  - <https://docs.gravityforms.com/sending-notifications-with-the-rest-api-v2/>
- **GitHub org:** <https://github.com/gravityforms> — the plugin core is not open source; the org
  publishes tooling such as the Gravity Forms CLI.
