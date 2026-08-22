# Google Maps Platform

Geocode and validate addresses, search places, compute routes and matrices,
snap GPS traces to roads, and read time zones and elevation.

- **Categories** — developer-tools, search
- **Auth methods** — api-key
- **Actions** — 15
- **Egress allowlist** — `maps.googleapis.com`, `places.googleapis.com`,
  `routes.googleapis.com`, `addressvalidation.googleapis.com`,
  `roads.googleapis.com`, `www.googleapis.com` (the `service` health check adds
  `status.cloud.google.com`)
- **Website** — https://mapsplatform.google.com
- **API docs** — https://developers.google.com/maps/documentation

Built against Google's own **discovery documents** where they are served —
`places.googleapis.com/$discovery/rest?version=v1` (148,503 bytes),
`addressvalidation.googleapis.com/…` (57,342), `roads.googleapis.com/…`
(31,463) — and against the REST reference for Routes, whose discovery document
is `403`. Every host and error shape below was **probed live on 2026-08-18**.

> **On categories.** There is no location or mapping slug in the controlled
> vocabulary (`core/rfcs/categories.md`), so this is filed under
> `developer-tools` — it is an API platform — and `search`, which Places Text
> Search and Autocomplete genuinely are.

## Setup

### The key

Cloud console → **APIs & Services → Credentials → Create credentials → API key**.

Two settings on that key decide whether any of this works, and both fail the
same way:

**Application restriction.** A key restricted to **HTTP referrers** — the
default a web developer reaches for — cannot be used from a server. There is no
referrer to send and every call comes back `REQUEST_DENIED`. Server integrations
need an **IP restriction**, or none.

**API restriction, and API enablement.** A key can be limited to a list of APIs,
and separately each API must be **enabled on the Cloud project**. Two switches,
one symptom. See *Health checks* below — this is what the `apis` check exists
for.

### The key travels in the query string

Not by choice. The newer hosts accept `X-Goog-Api-Key`; `maps.googleapis.com`
does not, and answers a header-only request with *"You must use an API key to
authenticate each request to Google Maps Platform APIs"*. The only form that
works across the whole surface is `?key=`, so that is what the auth hook signs
with, and it is why the key appears in request URLs.

## This is two APIs wearing one credential

Everything unusual about this app comes from here.

| | Generation 1 — "web services" | Generation 2 — the JSON APIs |
| --- | --- | --- |
| Hosts | `maps.googleapis.com` | `places.`, `routes.`, `addressvalidation.`, `roads.googleapis.com` |
| Used by | `geocode`, `geocode-reverse`, `timezone-get`, `elevation-get` | everything else |
| Success | **HTTP 200 always** | real HTTP codes |
| Failure | HTTP 200, `status: "REQUEST_DENIED"` | `400` with `error.status` |
| Bad key | HTTP **200** | HTTP **400**, not 401 or 403 |
| Error text | `error_message` … except Time Zone, which uses `errorMessage` | `error.message` |
| Rate limited | HTTP 200, `OVER_QUERY_LIMIT` | HTTP 429 |

Two consequences the app is built around:

**Reading `res.ok` on generation 1 sees success for everything**, including a
refused key. The client checks the body `status` instead, and a test asserts
that no action file contains `.ok` or a comparison against an HTTP status code.

**A rejected key on generation 2 is a `400`.** Anything that retries on 5xx,
fails on 401 and reports a bad request to the user will present a credential
problem as the caller's mistake. `describeRpc` translates it, in those words.

## `ZERO_RESULTS` is a success

Geocoding an address that does not exist is not an error. Google answers `200`
with `status: "ZERO_RESULTS"` and an empty array, which is the correct answer to
"where is 45 Nowhere Lane". `geocode` returns `found: false` for it rather than
throwing, so a workflow can branch on a bad address instead of failing the run.

## The field mask is the price control

Places and Routes require an `X-Goog-FieldMask` header. Omit it and the request
fails, loudly and immediately — that part is fine.

What is neither loud nor recoverable is that **the fields you ask for decide the
SKU you are billed at**. From Google's Place Details reference, read 2026-08-18:

| Tier | Fields (abridged) |
| --- | --- |
| Essentials (IDs Only) | `id`, `name`, `photos`, `attributions` |
| Essentials | `formattedAddress`, `location`, `types`, `viewport`, `addressComponents` |
| Pro | `displayName`, `businessStatus`, `primaryType`, `googleMapsUri`, `timeZone` |
| Enterprise | `rating`, `userRatingCount`, `websiteUri`, `priceLevel`, `regularOpeningHours`, phone numbers |
| Enterprise + Atmosphere | `reviews`, `editorialSummary`, `generativeSummary`, `parkingOptions`, every `serves*` |

Adding `places.rating` to a mask that was returning names and addresses moves
**every call in that workflow** from Essentials to Enterprise. Nothing in the
response says so. `*` works, is convenient, and bills at the top tier on every
call — Google's own documentation "discourages the use of the wildcard response
field mask in production".

So the mask is a first-class parameter with a deliberately cheap default, and
**every Places action returns and logs `billingTier`**. A run log that says
`Enterprise` on the day somebody added a field is a much cheaper way to find out
than an invoice. The tier table lives in `lib/fields.ts`, and an unrecognised
field name is assumed **expensive** — Google adds fields, and a new one is far
likelier to be at the top of the table than the bottom.

One asymmetry worth knowing: the search endpoints wrap results in `places[]`, so
their masks read `places.displayName`. A details response **is** the place, so
its mask reads `displayName`. `place-get` refuses a `places.`-prefixed mask up
front, because Google's own error is about an unknown field rather than about
the prefix.

## Actions

| Action | Type | What it does |
| --- | --- | --- |
| `geocode` | search | Address to coordinates, with the precision and the partial-match flag |
| `geocode-reverse` | search | Coordinates to the whole containing stack of addresses |
| `address-validate` | search | Whether an address is real, and what Google changed |
| `place-search-text` | search | Places by free text |
| `place-search-nearby` | search | Places of a type within a circle |
| `place-autocomplete` | search | Predictions for a partial string |
| `place-get` | read | One place in detail |
| `place-photo` | read | Resolve a photo reference into a URL |
| `route-compute` | read | A route, with the traffic model as an explicit choice |
| `route-matrix` | read | Every origin to every destination |
| `timezone-get` | read | The zone at a point, and its offset at a moment |
| `elevation-get` | read | Height, for points or sampled along a path |
| `geolocate` | search | Where a device is, from cell towers and wifi |
| `roads-snap` | search | Pull a GPS trace onto real roads |
| `roads-nearest` | search | The nearest road to each of a set of points |

Nothing here writes. Maps Platform is a read surface, so the app has no
`perform` actions at all, and a test asserts it.

### Things the actions do that the API does not

- **`geocode` surfaces `partialMatch`.** Google returns a confident-looking
  result for an address it had to guess at — a misspelled street, a house number
  that does not exist. The only signal is a field that is *absent* on a good
  match, so it is normalised to a boolean and lifted to the top level. For a
  real decision about an address, `address-validate` is the right action.
- **`geocode-reverse` returns the whole stack.** A point is inside a street, a
  suburb, a city, a county and a country, and all of them come back. Wanting the
  postcode and reading `results[0]` is how a street address ends up in a
  postcode column — so `resultType` is prominent.
- **`timezone-get` adds the two offsets.** `rawOffset` is the standard offset,
  `dstOffset` the extra seconds in force *at that instant*; neither is the
  answer alone. It also converts a pasted millisecond timestamp, which would
  otherwise land in the year 56000 and be answered without complaint.
- **`elevation-get` reports the coarsest `resolution`.** A resolution of 610
  means "the elevation of this building" is really the average elevation of half
  a square kilometre.
- **`route-compute` parses `"5400s"` into seconds.** Google's durations are
  protobuf strings; arithmetic on them yields `NaN` or string concatenation. It
  also defaults `routingPreference` to `TRAFFIC_AWARE` against Google's own
  `TRAFFIC_UNAWARE`, because a duration with no traffic in it is not a plannable
  number — and drops the preference entirely for `WALK` and `BICYCLE`, where
  sending it is an error rather than a no-op.
- **`route-matrix` counts the pairs that failed inside the 200.** Each element
  carries its own `status`, and Google's documentation warns to include it "to
  avoid false success indicators" — without it a failed pair simply has no
  duration, which reads as zero. The action **refuses a mask without `status`**,
  and reshapes the stream by `originIndex`/`destinationIndex`, because the
  elements arrive in no guaranteed order and reading them positionally will
  eventually pair the wrong origin with the wrong destination.
- **`place-search-nearby` reports `capped`.** There is no page token on that
  endpoint: twenty is the whole answer, and `rankPreference` decides *which*
  twenty. A workflow that assumes it saw everything within the radius is wrong
  exactly where it mattered.
- **`place-autocomplete` warns when there is no session token.** Autocomplete is
  meant to be called per keystroke and is billed that way unless every request
  in a session shares a token and the session is closed by a `place-get` with
  the same one. The action deliberately does **not** invent a token — one it
  made up would be discarded before the next keystroke and would achieve nothing
  while looking like it worked.
- **`place-photo` always sets `skipHttpRedirect`.** Called plainly the endpoint
  `302`s to image bytes, which a JSON step cannot hold. The URL it returns
  **expires**; the photo name does not, so both come back and the doc says which
  to store.
- **`geolocate` turns a 404 into an answer.** Google answers `404 notFound` when
  it cannot geolocate — too few usable access points, filtered MAC addresses.
  That is "not enough signal", not a broken URL. It also defaults `considerIp`
  **off**, against Google's default: with no signals given, IP fallback
  geolocates whatever machine ran the workflow, which is a datacentre.
- **`roads-snap` refuses more than 100 points** rather than truncating, because
  a silently shortened route looks perfectly plausible. The error says to
  overlap the batches, since snapping halves independently can leave the joint
  misaligned.
- **`roads-nearest` reports which points matched nothing.** A point at sea is
  absent from the response rather than null, so the gaps have to be derived from
  `originalIndex`. It is also not interchangeable with `roads-snap`: that one
  treats the input as a journey and uses the order; this one treats each point
  independently. The inputs look identical.

## Health checks

| Check | Kind | Scope | Credential | What it answers |
| --- | --- | --- | --- | --- |
| `service` | service | app | none | Open incidents on the Maps Platform status board |
| `apis` | credential | connection | signed | Which Maps APIs this key can actually reach |
| `quota` | quota | connection | — | Declared unavailable, with evidence |

### `apis` — the one worth reading about

Maps Platform is one credential in front of roughly a dozen products, each
enabled separately. A key that geocodes flawlessly returns `REQUEST_DENIED` from
Places until somebody clicks Enable, and nothing about the key distinguishes the
two states. The connection test can only speak for the API it calls.

The failure this prevents is specific: a workflow built and tested against
geocoding ships, and the first time it reaches its Routes step in production it
fails — with an error that reads like a bad request, because on the newer APIs a
disabled service is a `403` and a refused key is a `400`.

It probes five APIs with a request that is **deliberately unanswerable**: a
required parameter left out. That separates the two cases cleanly, because they
fail at different layers:

- **Not enabled, or key refused** — the request never reaches the service.
  `REQUEST_DENIED` on generation 1; `403 SERVICE_DISABLED` or `400
  API_KEY_INVALID` on generation 2.
- **Enabled** — the service itself complains about the missing parameter:
  `INVALID_REQUEST`, or `400 INVALID_ARGUMENT` naming the field.

So "the API told me my request was wrong" is the **good** outcome here, which
inverts the usual reading and is worth saying out loud. Nothing is geocoded, no
place is looked up, no route is computed — the probe asks for no data and does
not depend on any address existing.

Some APIs off is `degraded`, never `down`: a connection that only geocodes is
perfectly healthy with Places disabled, and an app-scoped check cannot know
which actions a workflow uses. *All* of them refused is `down`, and the message
names the three causes worth checking — an invalid key, a referrer restriction,
or billing disabled on the project. It runs at most every 15 minutes, because
enablement changes when a person clicks a button.

### `service`

Google Cloud's status site publishes `incidents.json` per product family, and
the **top-level one contains no Maps products at all** — verified live:
`status.cloud.google.com/incidents.json` has zero Maps entries in
`affected_products`, and `products.json` lists none. Using it here would have
produced a check that was permanently green because it watched the wrong
product. The Maps board has its own feed at
`status.cloud.google.com/maps-platform/incidents.json`, whose `service_name`
values are unmistakable: `Places API`, `Address Validation API`,
`Distance Matrix API`, `Weather API`.

That feed is an incident **log**, not a state summary, and reading a log for
current state is usually a mistake. What makes it safe here is that each
incident carries an `end` timestamp and an incident **without** one is still
open — a positive property of the document rather than an inference from
ordering. `status_impact` gives the severity.

It is `informational` and capped at `degraded`: `scope: "app"`, so it cannot
know which of the dozen APIs a connection calls, and an open incident on the
Weather API says nothing about a workflow that geocodes.

### `quota`

Declared unavailable with the evidence in `unavailable.reason`: reading the full
response headers from both generations on 2026-08-18, there is **no
`X-RateLimit` family, no `Retry-After` on a success, and no usage field in any
body** — a Geocoding call returns cache-control, vary and Google's security
headers, and a Places call adds only `server-timing`. The real numbers live in
the Cloud console and Cloud Monitoring, which is a different product on a
different credential (a service account, not this API key) that an app-level
health check has no business holding.

What *does* arrive in-band is failure rather than headroom —
`OVER_QUERY_LIMIT` inside an HTTP 200 on the older APIs, `429` on the newer —
and both are surfaced by the actions with that explanation attached.

## Icon

`assets/icon.svg` (192×192), downloaded verbatim from
`https://fonts.gstatic.com/s/i/productlogos/maps/v7/192px.svg` on 2026-08-18 —
Google's own product-logo CDN, the same source `google-business-profile` uses in
this pack. Checked with `_tools/icon-legibility.ts`.

## Tests

224 assertions across 23 files: one per action, one per auth method, one per
live health check, three for the libraries, and `index.ts`.

```bash
deno task check && deno task test && deno task lint && deno task validate
```

The `index.ts` suite also enforces the pack-wide sandbox rules on this app's own
source — no global `fetch`, no `Deno.*`, no credential handling outside the auth
hook — plus three specific to this app: nothing sets an `X-Goog-Api-Key` header
(which would work on half the hosts and silently fail on the other half),
nothing decides success from `res.ok` or an HTTP status code, and nothing logs
an address, a coordinate or a MAC address.
