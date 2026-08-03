# Meta Conversions API

Send server-side conversion events to a Meta dataset (pixel) through the Conversions API,
with Meta's required SHA-256 customer-data hashing applied **inside the app**.

- **Categories** — marketing, analytics, social-media
- **Auth methods** — conversions-token, oauth2
- **Actions** — 5
- **Egress allowlist** — `graph.facebook.com`
- **Graph API version** — `v25.0`
- **Website** — https://www.facebook.com/business/tools/conversions-api
- **API docs** — https://developers.facebook.com/docs/marketing-api/conversions-api/

---

## How customer data is hashed — read this first

Meta requires the contact fields of `user_data` to be **normalised and then SHA-256
hashed** before transmission:

> Our systems are designed to not accept customer information that is unhashed Contact
> Information, unless noted below… If you are using the Meta Business SDK, the hashing is
> done automatically.
>
> — [Customer Information Parameters][capi-user-data]

Sending raw PII is both a correctness failure (Meta rejects it, or it silently matches
nobody) and a privacy failure. So this app takes a position on it rather than leaving it
to the caller.

### The decision: **this app hashes on the caller's behalf, by default**

`hashing: "auto"` is the default on both write actions. A value that is already a
lowercase SHA-256 hex digest passes through untouched; anything else is normalised per
Meta's rules and hashed. `hashing: "pre-hashed"` is available and refuses any
required-hashed value that is not already a digest.

**Why hashing-by-default rather than requiring pre-hashed input.** The obvious objection
is that hashing for the caller means raw PII enters the action's input, and action inputs
are workflow variables — logged and persisted. That objection is real, but it does not
survive contact with how these workflows are actually shaped:

1. **The raw PII is already in the run either way.** The realistic trigger is "Shopify
   order created" or "form submitted", and that payload carries a plaintext email
   whatever this app does. Requiring pre-hashed input does not keep raw PII out of the
   platform; it only moves the hashing one step upstream, into a hand-written `@w6w/script`
   step — where the *same* raw value sits in the *same* variable store, now with a
   bespoke normalisation nobody reviewed.
2. **The failure mode of getting it wrong is silence.** A wrong normalisation does not
   error. `O'Brien` hashed as `obrien`, a phone left in national format, a date of birth
   hashed as `1985-04-12` — every one of these produces a perfectly valid digest that
   matches no human being, and the only symptom is Event Match Quality quietly sitting
   at 3. Concentrating that logic in one tested module, rather than in a script step per
   workflow, is the difference between one place to get it right and N places to get it
   wrong.
3. **Meta's own SDKs do exactly this.** The doc quoted above says the Business SDK hashes
   automatically. Requiring pre-hashed input would make this app stricter than the
   vendor's reference client, for no gain a caller can act on.
4. **The platform's credential posture is not violated.** The app contract's rule is that
   *credentials* are opaque and reach only the auth `sign` hook. Customer data is not a
   credential: it is the payload, and it must reach the network by definition. What the
   posture does demand — never widen what a hook can see, never leak a secret into a log —
   is honoured here, and pushed further (see "What is never logged").

Where the objection *does* hold — an upstream system that already stores hashes, or a
compliance rule that raw PII must never be materialised in a workflow variable —
`hashing: "pre-hashed"` is the switch, and it fails the call rather than the match.

### Nothing raw is ever forwarded, in either mode

This is the invariant the module is built around, and it is tested directly
(`tests/lib/user-data.test.ts`):

| Situation | `auto` | `pre-hashed` |
|---|---|---|
| `em: "test@example.com"` | normalised + hashed | **throws** — "looks like a raw email address" |
| `em: "<64 hex>"` | passed through | passed through |
| `em: "<32 hex>"` (MD5) | **throws** — "requires SHA-256" | **throws** |
| `ph: "020 7946 0958"` (no country code) | **throws** — trunk zero | **throws** |
| `country: "United States"` | **throws** — needs ISO alpha-2 | **throws** |
| `client_ip_address: "<64 hex>"` | **throws** — must be unhashed | **throws** |
| `user_data: {}` | **throws** — needs an identifier | **throws** |

A required-hashed value that somehow reached the end of the pipeline without matching
`^[a-f0-9]{64}$` throws as a post-condition. There is no code path that puts a plaintext
contact field on the wire.

### What is never logged

Every error thrown by `lib/user-data.ts` names the **field**, never the value —
`user_data.em: looks like a raw email address…`, not the address itself. Hook errors are
surfaced to the user and persisted with the run, so echoing the value would put the exact
PII this module exists to protect into the run log. (Meta's own SDK does interpolate the
offending value into its exceptions; this app deliberately does not.) The `ctx.log` line
in `send-event` records identifier **key names** only.

### Normalisation rules, and where they come from

Two sources, and they do not fully agree: the [customer-information-parameters
page][capi-user-data] (prose) and Meta's own Business SDK (`normalize.py`, the executable
spec — [source][sdk-normalize], read verbatim 2026-08-03). **Where they disagree, the SDK
wins**, because a hash is only worth anything if it is byte-identical to the one every
other integration produces.

| Field | Rule applied | Source / divergence |
|---|---|---|
| `em` | trim, lowercase; must match `.+@.+\..+` | SDK and docs agree |
| `ph` | strip `[\s\-()]`, strip a leading `+` and up to two `0`s, then require `^\d{1,4}\(?\d{2,3}\)?\d{4,}$` | SDK. The doc's looser "remove symbols, letters" would silently accept `…1234 ext 9` |
| `fn`, `ln` | trim, lowercase — **punctuation kept** | **Divergence.** Docs say "no punctuation"; the SDK has no branch for these fields, so it hashes `o'brien` intact. Following the docs would break matching against every SDK-produced hash. Pinned by a test so a change is deliberate |
| `db` | strip non-digits, require 8 digits, range-check `YYYYMMDD` | **Divergence.** The SDK has no `db` branch and hashes the string as given — a gap, not a rule; `1985-04-12` hashed verbatim matches nothing. Docs are unambiguous that the wire format is `YYYYMMDD` |
| `ge` | first character, must be `f` or `m` | **Divergence.** The SDK gets there by construction (its `Gender` enum's values are already `f`/`m`) rather than by normalising, so a caller passing `female` would otherwise hash an unmatched string |
| `ct`, `st` | strip `[0-9.\s\-()]` | SDK |
| `zp` | strip whitespace, keep the part before the first `-` | SDK. Note it does **not** truncate to 5 characters, despite the doc's "first 5 digits for U.S. zip codes" — that would mangle every non-US postcode |
| `country` | strip non-alpha, require 2 letters | SDK (which additionally checks the code against ISO 3166-1 via `pycountry`; this app checks the shape, not the membership — shipping a country table for a format check is not worth its weight) |
| `external_id` | **forwarded verbatim, not hashed** | **Divergence.** Docs say "hashing recommended"; `UserData.normalize()` in the SDK dedupes it and passes it through. Meta also says to send it "in the same format as other channels" — hashing here while a sibling channel sends it raw would silently destroy the join |
| `client_ip_address`, `client_user_agent`, `fbc`, `fbp`, `subscription_id`, `fb_login_id`, `lead_id`, `anon_id`, `madid`, `page_id`, `page_scoped_user_id`, `ctwa_clid`, `ig_account_id`, `ig_sid` | forwarded verbatim; hashing them is rejected | Docs, "Do Not Hash" |

Unrecognised `user_data` keys are passed through untouched — Meta adds members faster than
any app can track — while every key it documents as requiring a hash is enforced.

---

## Usage

### Connect

**`conversions-token` (recommended).** In Events Manager, open the dataset →
Settings → Conversions API → *Generate access token*. Meta is explicit that this path
needs nothing else: "Your app does not need to go through App Review. You do not need to
request any permissions." Paste the token plus the numeric **dataset (pixel) ID**; the id
is stamped onto the connection at connect time, so actions do not need it per call.

**`oauth2`.** For platform partners sending events on behalf of many advertisers, which
Meta gates behind advanced `ads_management` access and the Marketing API Access Tier. An
OAuth grant names no dataset, so **connections made this way must pass `datasetId` on
every action**; the error says so if you forget.

### Actions

| Key | Type | Endpoint |
|---|---|---|
| `send-event` | perform | `POST /{dataset-id}/events` — one event, as a form |
| `send-events` | perform | `POST /{dataset-id}/events` — a raw batch, up to 1000 |
| `get-dataset` | read | `GET /{ads-pixel-id}` |
| `get-dataset-quality` | read | `GET /dataset_quality?dataset_id=…` |
| `list-diagnostics` | read | `GET /{ads-pixel-id}/da_checks` |

`send-event` is `idempotent: true` honestly: Meta deduplicates on the pair
(`event_name`, `event_id`), and `event_id` defaults to `ctx.invocation.invocationId`, so a
retried invocation resolves to the same conversion. `send-events` is `idempotent: false` —
the caller owns `event_id` there, and stamping the invocation id across a batch would
collapse a thousand distinct conversions into one.

The three reads all require `ads_read`, which a dataset-scoped Events Manager token
generally does **not** carry; expect them to 403 on a `conversions-token` connection and
to work on an `oauth2` one. That asymmetry is exactly why neither the auth `test` hook nor
the `quota` check probes them.

`get-dataset-quality` is the action that closes the loop on hashing: a mis-normalised
payload does not error, it just fails to match, and Event Match Quality is the only place
that shows.

### Scope — what this app is *not*

The Conversions API is a small, write-oriented API and this app ships all of it.
Specifically, and verified rather than assumed:

- **There is no deletion endpoint.** The [`/{ads_pixel_id}/events` reference][ref-events]
  states that `GET` and `DELETE` are both unsupported on this edge — "You can't perform
  this operation on this endpoint". Event deletion is not part of this surface.
- **Offline / physical-store events are not a separate surface.** They are the same
  `POST /{dataset-id}/events` call with `action_source: "physical_store"`
  ([docs][capi-offline]) — reachable through either write action. The legacy Offline
  Conversions API (`/{offline_event_set_id}/events`) is a *different*, older surface that
  Meta still supports in parallel; it is deliberately out of scope here.
- **App events and business-messaging events** are also the same endpoint, distinguished
  by `action_source` plus an `app_data` object. `send-events` carries `app_data` through
  untouched; there is no separate action because there is no separate endpoint.

### Test events

Set **Test Event Code** (Events Manager → Test Events) on either write action. It rides at
the top level of the request body alongside `data`, not on the event — which is what the
[reference][ref-events] specifies. Remove it before going live.

---

## Health check

Three different questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left. Only the
second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://metastatus.com>

Re-verified 2026-08-03 rather than inherited from the sibling Meta apps: `metastatus.com`,
`/rss`, `/feed` and `/api/v1/status` all answer `200 text/html`. The site is a single-page
app serving its shell for every path, so there is no Atom/RSS document to name in a
`feed` and no JSON to parse. The developer view at
developers.facebook.com/status/dashboard is the same story.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

| Auth method | Probe |
|---|---|
| `conversions-token` | `GET /me?fields=id` (plus a local check that both the token and the dataset id are present) |
| `oauth2` | `GET /me?fields=id` |

Both probe `/me` deliberately. It is the cheapest call any Meta token can make and the
only one a *dataset-scoped* Conversions API token is guaranteed to be allowed — probing
the dataset node instead would report a perfectly working credential as broken whenever
the token lacks `ads_read`, which is the normal case for an Events Manager token. Per the
healthcheck RFC: probe an endpoint the narrowest usable credential can still reach.

For diagnosing a token rather than just probing it, `GET /debug_token?input_token=…`
returns its type, scopes, expiry and owning app.

### Do we have quota left?

Two meters, unlike the sibling `facebook` apps, because Conversions API calls are counted
as Marketing API calls and Meta meters those separately:

- **`X-App-Usage`** — platform rate limits, app-wide:
  `{"call_count":28,"total_time":25,"total_cputime":25}`.
- **`X-Business-Use-Case-Usage`** — the Business Use Case limits that actually govern
  Marketing API traffic, per business and per use-case type, including
  `estimated_time_to_regain_access` (minutes) when Meta is currently blocking you.

Both report **percentage consumed**, not remaining, and throttling starts when any meter
reaches 100 — so the check reports `remaining: 100 - used` with `unit: "percent"`, and a
`limit` of 100 is the literal truth rather than a placeholder. A non-zero
`estimated_time_to_regain_access` is reported as a hard `down` with a `resetAt`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:conversions-token` | credential | connection | signed | fatal | — | derived from the `conversions-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

**`service` is declared absent.** Meta publishes nothing machine-readable (see above). A
declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever. The `quota` check
is the closest automatable proxy for platform health.

---

## Relationship to `facebook` and `facebook-lead-ads`

Three apps, one vendor, three surfaces that do not overlap:

| App | What it is | Direction |
|---|---|---|
| `facebook` ("Facebook Pages") | Graph API content surface — Pages, posts, comments, photos, videos, Page insights, read-only ad campaigns | read + write |
| `facebook-lead-ads` | The leadgen surface — `{page_id}/leadgen_forms`, `{form_id}/leads` | read |
| **`facebook-conversions`** (this app) | Measurement ingestion — `{dataset_id}/events` and its companion reads | **write** |

They are separate apps rather than one because they are separate *products* with separate
credentials: a Page access token cannot post a conversion, and a dataset-scoped
Conversions API token cannot read a Page. This is also the only one of the three that
handles customer PII, and the only one whose value lies in a transformation (normalise +
hash) rather than in a request shape.

The Graph API version pin differs deliberately — `facebook` is on `v23.0` for its
Pages/Insights surface, this app is on `v25.0` (released 2026-02-18, expiring 2028-07-29,
and the version Meta's own Conversions API examples use). There is no reason for two
independently-versioned apps to move in lockstep.

The icon is the same Meta/Facebook mark the sibling apps carry.

---

## Links

Every URL below was verified by reading its content on 2026-08-03, not by status code
alone.

- Conversions API overview — https://developers.facebook.com/docs/marketing-api/conversions-api/
- Get Started (token generation, no App Review) — https://developers.facebook.com/docs/marketing-api/conversions-api/get-started/
- Using the API (endpoint, 1000-event limit, 7-day window) — https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api
- End-to-end implementation (response shape, partner permissions) — https://developers.facebook.com/docs/marketing-api/conversions-api/guides/end-to-end-implementation/
- Server Event Parameters — https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event
- Customer Information Parameters (the hashing contract) — https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters/
- Custom Data Parameters — https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/custom-data
- Offline / physical-store events — https://developers.facebook.com/docs/marketing-api/conversions-api/offline-events
- Dataset Quality API — https://developers.facebook.com/docs/marketing-api/conversions-api/dataset-quality-api/
- `POST /{ads_pixel_id}/events` reference (no GET, no DELETE) — https://developers.facebook.com/docs/marketing-api/reference/ads-pixel/events/
- `GET /{ads_pixel_id}` reference — https://developers.facebook.com/docs/marketing-api/reference/ads-pixel/
- `GET /{ads_pixel_id}/da_checks` reference — https://developers.facebook.com/docs/marketing-api/reference/ads-pixel/da_checks/
- Meta Pixel standard events — https://developers.facebook.com/docs/meta-pixel/reference
- Graph API version changelog — https://developers.facebook.com/docs/graph-api/changelog/versions
- Rate limiting (`X-App-Usage`, `X-Business-Use-Case-Usage`) — https://developers.facebook.com/docs/graph-api/overview/rate-limiting/
- Business SDK normalisation (the executable spec for hashing) — https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/normalize.py
- Product page — https://www.facebook.com/business/tools/conversions-api
- Status page — https://metastatus.com

[capi-user-data]: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters/
[capi-offline]: https://developers.facebook.com/docs/marketing-api/conversions-api/offline-events
[ref-events]: https://developers.facebook.com/docs/marketing-api/reference/ads-pixel/events/
[sdk-normalize]: https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/normalize.py

---

Researched and endpoint-verified 2026-08-03 against Meta's live documentation and the
Business SDK source. Status surfaces and normalisation rules move; re-check before
assuming a probe or a hash rule still holds.
