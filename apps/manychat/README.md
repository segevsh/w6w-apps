# Manychat

Chat-marketing automation for Messenger, Instagram, WhatsApp and Telegram — subscribers, tags,
custom fields, bot fields, Automations, and sending — on the **Manychat Public API (Page API)**.

- **Categories** — marketing, communication, social-media
- **Auth methods** — bearer (one API token per Page)
- **Actions** — 25
- **Egress allowlist** — `api.manychat.com` (plus `status.manychat.com`, on the service health hook only)
- **Website** — https://manychat.com
- **API docs** — https://api.manychat.com/swagger

Manychat is the layer between a business and Meta's messaging surfaces. It owns the subscriber
record, the tags and fields that segment it, and the Automations that talk to it. This app manages
that record and triggers those Automations; it does **not** replace them — the messaging itself is
still governed by Meta's platform rules, which is the single most important thing on this page (see
[The 24-hour window is real](#the-24-hour-window-is-real)).

---

## Where this contract came from

The integration catalogue's link — `https://api.manychat.com/swagger` — is **correct**, which is
worth saying because it is the exception rather than the rule. But it is a 2.2 KB HTML shell that
boots Swagger UI in a browser; `curl` gets nothing useful from it. The machine-readable spec is at
a URL the page only names inside a `<script>` block:

```
GET https://api.manychat.com/swagger/compileJson?type=Page_API      → 39 KB, application/json
GET https://api.manychat.com/swagger/compileJson?type=Profile_API   → 2.8 KB, application/json
```

Both are OpenAPI 3.0.0 documents. Both were fetched on **2026-08-03**, and **every path, parameter
name, request-body field, response shape and rate limit in this app was transcribed from them**.
Where a fact is not in them, it is called out as such in `lib/client.ts` and in
[What is *not* verified](#what-is-not-verified) below.

Two things the spec does **not** state, confirmed elsewhere:

| Fact | How it was confirmed |
| --- | --- |
| Base URL is `https://api.manychat.com` | The spec says `"servers": [{ "url": "" }]`. Manychat's own PHP client hardcodes `const API_URL = 'https://api.manychat.com'` (`manychat/manychat-api-php`, `src/API/BaseAPI.php`), and the host answers on the wire — see below. |
| Auth is `Authorization: Bearer <token>` | The spec's one security scheme is `{"type":"http","scheme":"bearer"}`, and the API says so itself. |

Verified on the wire, 2026-08-03:

```console
$ curl -sSi https://api.manychat.com/fb/page/getInfo
HTTP/2 401
content-type: application/json; charset=UTF-8
{"status":"error","message":"Token is required"}

$ curl -sSi -H 'Authorization: Bearer 123456:deadbeef' https://api.manychat.com/fb/page/getInfo
HTTP/2 401
{"status":"error","message":"Wrong token"}
```

Two *different* messages for "no header" and "bad header" — so the header name and the `Bearer`
prefix are both right, and only the value is wrong. That is as far as verification goes without an
account, and this README does not pretend otherwise.

---

## The 24-hour window is real

**Read this before you wire up a send.** Manychat is a client of Meta's messaging platform, and
Meta — not Manychat — decides when a business may message a person. Outside a 24-hour window
following the person's last interaction, an untagged message to a Messenger or Instagram subscriber
is **refused**, not delivered late and not silently dropped into a queue.

The primary evidence is in the spec itself. `POST /fb/sending/sendContent` takes two parameters
that exist for no other reason:

| Parameter | What it is |
| --- | --- |
| `message_tag` | Meta's fixed vocabulary of non-promotional reasons (the spec's example is `ACCOUNT_UPDATE`). Meta owns the list and enforces what qualifies. |
| `otn_topic_name` | Spends a **One-Time Notification** permission the subscriber granted for that named topic. Takes the topic's *name* — get it from `list-otn-topics`. |

Manychat's community forum quotes the refusal verbatim as:

> Content can't be sent to subscriber id='xxx' without message tag. Subscriber's last interaction
> was over XXh ago (more than 24 hours ago)

*(Forum, not primary documentation — flagged as unverified. It matches the spec's parameter set
exactly, which is why it is quoted at all.)*

Practical consequences for a workflow:

- **`get-subscriber` returns `last_interaction`.** That is the clock. It is also the only nullable
  field in the `Subscriber` schema — a subscriber who has never interacted has no window at all.
- **`send-flow` takes neither parameter.** `POST /fb/sending/sendFlow`'s body is `{ subscriber_id,
  flow_ns }` and nothing else. Nothing in the spec says the window is waived for Flows; the knobs
  that open it are simply absent from that endpoint.
- **A `status: "success"` is an acceptance, not a delivery receipt.** The response envelope carries
  no message id and no delivery state. There are community reports of a successful `sendContent`
  whose Instagram image never arrived. Do not treat a success here as proof a human saw anything.
- **Misusing a message tag is a policy violation**, not a workaround. Meta enforces it.

This app surfaces the mechanism and refuses to hide it. It does **not** pre-flight the window
client-side: reading `last_interaction` and deciding for the caller would add a race (the window can
close between the read and the send), a second API call, and a false sense of safety. Manychat owns
that enforcement and does it correctly.

---

## Two things that look the same and are not

### 1. Custom fields vs. bot fields

Identical schemas (`{ id, name, type, description }`, plus `value`), adjacent endpoints, both under
`/fb/page/`. Completely different meaning:

| | Custom field | Bot field |
| --- | --- | --- |
| Scope | One value **per subscriber** | One value **for the whole Page** |
| Define | `create-custom-field` | `create-bot-field` |
| List definitions | `list-custom-fields` (no values) | `list-bot-fields` (**with** values) |
| Write | `set-subscriber-field`, `set-subscriber-fields` | `set-bot-field`, `set-bot-fields` |
| Typical use | plan tier, last order id, city | feature flag, current promo code, stock count |

`list-bot-fields` carries values inline because there is only one of each; `list-custom-fields`
cannot, because a value belongs to a subscriber. To read one subscriber's values, use
`get-subscriber` — its payload inlines `custom_fields[]` with a `value` on each.

**A create-time gotcha that is genuinely the vendor's:** `createCustomField` requires **`caption`**
and returns the same thing as **`name`**; `createBotField` requires **`name`**. Same vendor, same
prefix, one word apart. Both are transcribed as the spec has them rather than made consistent,
because consistency invented here would just be a 400.

### 2. Deleting a tag vs. untagging a person

Manychat names these one path segment apart:

| Endpoint | What it does |
| --- | --- |
| `POST /fb/subscriber/removeTag` | Takes the tag off **one** subscriber. → `remove-subscriber-tag` |
| `POST /fb/page/removeTag` | *"Removes specified tag from the page and the page's subscribers. **This action can not be undone.**"* → `delete-tag` |

The action names here are deliberately **not** one word apart, and `delete-tag` is titled
"Delete Tag (destructive)". It also refuses to run when given both a `tagId` and a `tagName`,
rather than resolving by precedence — an irreversible delete is the wrong place to guess which
identifier the caller meant.

---

## Ids are strings, on purpose

The spec types `subscriber_id` as `integer` in every request body, but types `Subscriber.id` and
`Subscriber.page_id` as **`string`** in every response. That is not sloppiness — these are
Meta-scale ids that exceed JavaScript's safe integer range (2^53), and round-tripping one through a
JS `number` silently corrupts the low digits.

So every subscriber id in this app is a **string**, passed through unparsed. Tag ids and field ids
*are* parsed to numbers, because those are Manychat-internal and small, and the spec types them
`integer` on both sides.

## Field values are coerced, narrowly

A workflow form hands you a string. Manychat's field types include `boolean` and `number`, and the
write endpoints take a single `field_value` documented as *"string, integer or boolean"* with the
examples `'string'`, `123`, `true`, `'2018-07-18'`, `'2018-07-02T00:00:00+00:00'`.

`coerceFieldValue` in `lib/client.ts` converts exactly two unambiguous cases and leaves everything
else alone:

| Input | Sent as | Why |
| --- | --- | --- |
| `"true"` / `"false"` | `true` / `false` | a boolean field storing the *string* `"true"` is a silent bug |
| `"42"`, `"-7"`, `"3.5"` | `42`, `-7`, `3.5` | canonical numbers only |
| `"007"` | `"007"` | a leading-zero reference code turned into an integer is data loss |
| `"2026-08-03"` | `"2026-08-03"` | dates are strings in the vendor's own examples |
| `"1e5"`, `" 1"`, `"TRUE"` | unchanged | not canonical; not this function's business |

One deliberate exception: `find-subscribers-by-custom-field`'s `field_value` is **not** coerced. It
is a *query parameter* that the spec types as `string` even for Number fields, not a JSON body
value.

---

## Actions (25)

### Page

| Action | Endpoint | Notes |
| --- | --- | --- |
| `get-page-info` | `GET /fb/page/getInfo` | No parameters at all. `is_pro` is the plan flag; `timezone` frames date-typed values. |
| `list-tags` | `GET /fb/page/getTags` | Unpaginated — the response is the whole list. |
| `create-tag` | `POST /fb/page/createTag` | Result nests under `data.tag`. |
| `delete-tag` | `POST /fb/page/removeTag` · `removeTagByName` | **Irreversible.** Strips the tag from every subscriber too. |
| `list-custom-fields` | `GET /fb/page/getCustomFields` | Definitions only; no values. |
| `create-custom-field` | `POST /fb/page/createCustomField` | Takes `caption`, returns `name`. Type is fixed at creation. |
| `list-flows` | `GET /fb/page/getFlows` | Returns `data.flows` **and** `data.folders`. A flow's `ns` is what `send-flow` takes. |
| `list-growth-tools` | `GET /fb/page/getGrowthTools` | |
| `list-otn-topics` | `GET /fb/page/getOtnTopics` | `send-content`'s `otnTopicName` takes a name from here. |

### Bot fields (Page-global key/value)

| Action | Endpoint | Notes |
| --- | --- | --- |
| `list-bot-fields` | `GET /fb/page/getBotFields` | Values included. |
| `create-bot-field` | `POST /fb/page/createBotField` | Takes `name` (not `caption`). |
| `set-bot-field` | `POST /fb/page/setBotField` · `setBotFieldByName` | Idempotent absolute write. |
| `set-bot-fields` | `POST /fb/page/setBotFields` | Batch. See [the batch quirk](#the-batch-endpoints-ask-for-both-identifiers). |

### Sending

| Action | Endpoint | Notes |
| --- | --- | --- |
| `send-flow` | `POST /fb/sending/sendFlow` | **Usually the right one.** Content authored in Manychat, channel-agnostic. Capped at **100 sends per subscriber per hour**. |
| `send-content` | `POST /fb/sending/sendContent` | Ad-hoc Dynamic Block payload. Carries `messageTag` / `otnTopicName`. |

Neither is idempotent. A retry sends a second message to a human.

### Subscriber — reads

| Action | Endpoint | Notes |
| --- | --- | --- |
| `get-subscriber` | `GET /fb/subscriber/getInfo` | Cross-channel identity, tags, field values, `last_interaction`, `live_chat_url`. |
| `find-subscribers-by-name` | `GET /fb/subscriber/findByName` | **Full name**, not a prefix match. Capped at 100, no pagination. |
| `find-subscriber-by-system-field` | `GET /fb/subscriber/findBySystemField` | Email **or** phone, exactly one. Returns a **single object**. 50 q/s — the fastest lookup. |
| `find-subscribers-by-custom-field` | `GET /fb/subscriber/findByCustomField` | **Text and Number fields only.** Capped at 100, sorted by most recent update. No by-name variant exists. |

### Subscriber — writes

| Action | Endpoint | Notes |
| --- | --- | --- |
| `create-subscriber` | `POST /fb/subscriber/createSubscriber` | Email / phone / WhatsApp only — **cannot create a Messenger or Instagram contact.** |
| `update-subscriber` | `POST /fb/subscriber/updateSubscriber` | No `whatsapp_phone` here; the spec does not list it. |
| `add-subscriber-tag` | `POST /fb/subscriber/addTag` · `addTagByName` | Prefer the name. Set semantics — idempotent. |
| `remove-subscriber-tag` | `POST /fb/subscriber/removeTag` · `removeTagByName` | Untags one person; the tag survives. |
| `set-subscriber-field` | `POST /fb/subscriber/setCustomField` · `setCustomFieldByName` | Field names are **not case sensitive**. The field must already exist — no upsert. |
| `set-subscriber-fields` | `POST /fb/subscriber/setCustomFields` | Batch. |

### `create-subscriber` cannot create a chat contact

Worth repeating because the name invites the wrong assumption. The body schema's three identity
fields are `email`, `phone` and `whatsapp_phone` — there is no `psid`, no `ig_id`, no Messenger
handle. Messenger and Instagram subscribers come into existence when a person messages the Page or
taps a Growth Tool; they cannot be conjured from an API call, because Meta does not let a business
initiate. This endpoint is for the email/SMS/WhatsApp side of an audience.

Its conditional requirements are consent rules, not validation trivia. The spec requires
`has_opt_in_sms` whenever a phone is supplied, `has_opt_in_email` whenever an email is, and
`consent_phrase` whenever SMS opt-in is true. **This app enforces only the "at least one identity"
rule** and lets Manychat enforce the rest: an opt-in flag is a claim about what a human agreed to,
and a client-side check that waves compliance through when the shape looks right is worse than no
check.

### The batch endpoints ask for both identifiers

`setBotFields` and `setCustomFields` mark **all three** of `field_id`, `field_name` and
`field_value` required on each array element, where the two single-field endpoints take one
identifier *or* the other. Whether that is actually enforced is not verifiable without an account,
so both batch actions **forward each element as given** and coerce only `field_value`. Nothing is
inferred: turning a name into an id would need a lookup these actions do not perform, and could bind
the write to the wrong field.

---

## Health checks

### `service` — Manychat platform status

Reads `https://status.manychat.com/v2/components.json`. Unauthenticated, unsigned,
`scope: "app"`, `credential: "none"`, `minIntervalSeconds: 60`. `status.manychat.com` is declared on
**the hook's** `network.allow`, not the app manifest's — no action has business calling a status
host, and a signed request must never reach one.

**The obvious host is dead.** The reflex is `<vendor>.statuspage.io`. Manychat has one, and shipping
a probe against it would have been a silent, permanent `unknown`:

```console
$ curl -sSIL https://manychat.statuspage.io
… 200, redirected to https://manychat.statuspage.io/inactive
$ curl -sS https://manychat.statuspage.io/api/v2/status.json
HTTP 401 · application/json
Your page is inactive. Please include an API key to access this resource.
```

The live page is `status.manychat.com`, served by **Instatus**, not Atlassian.

**Verified two ways** (both required, both run 2026-08-03):

1. **Bogus sibling path on the same host.** `GET /bogus-sibling-xyz.json` → **404,
   `text/html; charset=utf-8`, 7418 bytes, md5 `3cfb919b764e…`** (a Next.js 404 shell). The real path
   returns **200, `application/json`, 419 bytes, md5 `9c6ca6ad9447…`**. Different status, different
   content-type, different bytes ⇒ this host routes; it is not a catch-all. `/status.json` and
   `/api/status.json` return that same 404 shell, which is how the correct path was *found* rather
   than assumed.
2. **Content-type and body.** `/v2/components.json` → **200, `application/json`, 1874 bytes**,
   opening `{"components":[{"id":"clbf5tl610000ixn2dimgd1yj-6fpt42w2j7f8","name":"Manychat: Web
   Application",…}` — JSON for a `.json` path, carrying Manychat's own component names. Not an HTML
   impostor, and not the ~127 KB Atlassian marketing page an unclaimed `*.statuspage.io` serves.

A 200 with an error body is still not health, so the hook refuses to interpret anything unless
`components` is genuinely an array.

**Why `/v2/components.json` and not the obvious `/summary.json`.** `/summary.json` is smaller and
gives `page.status` plus `activeIncidents[]` in one round trip. It was ruled out on evidence. On
2026-08-03 it returned:

```json
{"page":{"name":"Manychat","status":"UP"},
 "activeIncidents":[{"name":"Delays and failures in Follow to DM … on Instagram",
                     "status":"IDENTIFIED","impact":"DEGRADEDPERFORMANCE"}]}
```

`page.status` said **UP** while an incident was open and identified. A check reading that field
alone would report green through a real, ongoing degradation. A check reading `activeIncidents`
alone would report a Messenger-only tenant as degraded over an Instagram problem it cannot feel.
`components.json` costs the same one request and answers both correctly.

**Which component drives the verdict.** The eleven components split cleanly:

- **Manychat's own** — Web Application, Sign In / Sign Up, Message sending, Growth Tools,
  **Public API**, AI Services.
- **Third-party channels** — Facebook API, Instagram API, WhatsApp API, Telegram API, Twilio API.

`state` comes from **`Manychat: Public API`** alone — the surface every action here calls, and the
only one whose failure is a failure *of this integration*. Every other component is reported under
`components` for attribution but never folded into `state`. The third-party ones in particular must
not drive it: a Page automating only Messenger is unaffected by a WhatsApp outage, and degrading
that tenant is a false alarm about a channel it does not use. If `Manychat: Public API` ever
disappears from the feed, the check reports `unknown` and says so rather than quietly falling back
to a different component.

**Severity is left at the kind default (`degraded`) — deliberately.** Manychat is pure SaaS: no
self-hosted edition, no per-tenant hostname, exactly one API host. A Public API outage really does
hit every tenant. This is *not* the `apps/discourse` case, where the status page covers the vendor's
*hosting* while most installs are self-hosted and the default severity would falsely degrade
unaffected tenants. The per-tenant risk here lives entirely in the third-party channel components,
and those are excluded from `state` for exactly that reason.

### `quota` — declared **unavailable**, with `severity: "informational"`

Manychat publishes rate limits, and they are useless to a probe.

Every operation carries its ceiling in the spec's `description` field, as English prose: 100 q/s for
`getInfo` and `getTags`, 50 q/s for `findBySystemField`, 25 q/s for `sendContent`, 20 q/s for
`sendFlow`, 10 q/s for everything else. Those are **fixed constants**, the same for every account on
every day. Nothing reports how much of a second's allowance has been spent, and a per-second window
is gone before a health check could report it. Restating a constant would be documentation wearing a
probe's clothes, and a verdict that is green by construction is worse than no verdict.

`sendFlow`'s second limit — **100 sends per subscriber per hour** — *is* a consumable balance, and
it is the one to watch in a fan-out. But it is per **subscriber**, and no endpoint reports the
counter, so it cannot be probed at app or connection scope. It is documented above instead.

**No rate-limit headers.** Checked on the wire, 2026-08-03 — the complete header set was:

```console
$ curl -sSD - -o /dev/null -H 'Authorization: Bearer 123456:deadbeef' \
    https://api.manychat.com/fb/page/getInfo
HTTP/2 401
date: Mon, 03 Aug 2026 20:44:33 GMT
content-type: application/json; charset=UTF-8
strict-transport-security: max-age=31536000; includeSubDomains; preload
```

Three headers, no counter. **Stated plainly because it is the one gap in the evidence:** that is a
401, observed without an account. An authenticated 200 *could* in principle carry headers a rejected
request does not. Nothing in the OpenAPI document, in Manychat's official PHP client (which reads
only the JSON body and inspects no headers at all), or in its published error vocabulary mentions
such a header — so the conclusion is well-supported but not exhaustively proven.

**No allowance endpoint.** None of the Page API's 36 operations reports plan limits, credits or
remaining quota. `getInfo`'s `is_pro` is a plan *flag*, not a balance. The Profile API has exactly
one operation and is about template sharing.

`severity: "informational"` is mandatory, not cosmetic: an `unavailable` entry always reports
`unknown`, and at the default `degraded` severity that would propagate into every roll-up and pin
this app at `unknown` forever.

---

## What is *not* verified

Everything in this app comes from Manychat's own OpenAPI documents, its own PHP client, its own
Dynamic Block repository, or the wire. These four things do not, and are flagged wherever they
appear:

1. **The plan tier required to mint an API token.** Manychat's help centre documents where the token
   lives (Settings → API); that page sits behind Cloudflare's JS challenge and could not be read from
   this environment on 2026-08-03. No plan requirement is asserted anywhere in this app.
2. **Whether an authenticated response carries rate-limit headers.** See `quota` above.
3. **Whether the batch endpoints truly require both `field_id` and `field_name`.** The spec says
   they do; the single-field endpoints take one or the other. Not testable without an account.
4. **The exact refusal message outside the 24-hour window,** and the report that `sendContent` can
   return `success` without delivering an Instagram image. Both are from Manychat's community forum,
   quoted as forum content.

## What was deliberately **not** built

| Endpoint | Why not |
| --- | --- |
| `GET /fb/page/getWidgets` | **Vendor-deprecated.** Its own description reads: *"Use getGrowthTools instead."* Same `Growth Tools` schema; "widget" was the old name. `list-growth-tools` is the replacement. |
| `POST /fb/sending/sendContentByUserRef` | A `user_ref` is a pre-opt-in Messenger primitive minted by the Checkbox / customer-chat plugin and delivered to a webhook. This app has no webhook surface, so there is no honest way for a workflow to obtain one. Shipping it would be shipping a parameter nobody can fill. |
| `GET /fb/subscriber/getInfoByUserRef` | Same reason. |
| `POST /fb/subscriber/verifyBySignedRequest` | Requires a `signed_request` produced by Meta's Messenger Extensions SDK inside a webview. Not obtainable from a workflow. |
| Profile API (`POST /user/template/generateSingleUseLink`) | A different API surface with one operation, about sharing Manychat *templates* between accounts. It is not part of managing a Page's audience, and the token posture for it was not verifiable. |

---

## Sandbox posture

- All network goes through `ctx.fetch`. Global `fetch` is never called; `Deno.*` is never touched.
- The credential appears **only** in `auth/api-token.ts`'s `sign`, `test` and `afterConnect` hooks.
  No action sees it, and it is never interpolated into a URL or an error message —
  `tests/auth/api-token.test.ts` asserts both.
- `formatError` renders vendor error bodies without echoing the request, query string or headers.
- `afterConnect` reads `GET /fb/page/getInfo`, whose `Page` schema is public profile metadata only
  (`id`, `name`, `category`, `avatar_link`, `username`, `about`, `description`, `is_pro`,
  `timezone`). No credential material, which is what makes it safe to put on the Connection's
  `display`.
- The manifest allowlists `api.manychat.com` and nothing else. `status.manychat.com` is widened for
  the one unsigned health hook that needs it.

## Icon provenance

**The icon in `assets/icon.svg` was drawn for this pack — it is not Manychat's mark.** Stating this
because the pack README promises vendor marks.

What was tried, on 2026-08-03:

- **n8n** (`packages/nodes-base/nodes/`) — no ManyChat node exists, so there was nothing upstream to
  port.
- **Simple Icons** — no `manychat` entry (`cdn.simpleicons.org/manychat` and the repo path both 404).
- **manychat.com, static.manychat.com, app.manychat.com** — all behind a Cloudflare JS challenge
  (403 to any non-browser client), including the favicon paths.
- **help.manychat.com** — reachable, and its header does carry a "Manychat logo" theming asset, but
  that asset URL itself 403s behind the same challenge.
- **The logo on their status page CDN** — fetchable, and it is a 500×88 **wordmark in black**, not a
  square symbol. Unusable as an app icon.

So the icon is an original chat-bubble mark in Manychat's brand indigo **`#3A46BD`** — which is not
invented either: it is the `brand_color` value Manychat sets in its own help-centre theme config.
Replace it with the real mark if one becomes obtainable.

---

## Links

Every URL below was checked on 2026-08-03 by fetching it and inspecting the response, not by
assuming a 200.

- **Website** — https://manychat.com *(403s to non-browser clients behind Cloudflare; loads in a
  browser)*
- **API docs** — https://api.manychat.com/swagger *(Swagger UI shell; the spec itself is at
  `https://api.manychat.com/swagger/compileJson?type=Page_API` and `?type=Profile_API`)*
- **Source / git org** — https://github.com/manychat — **there is no product repository; Manychat is
  closed source.** The org holds exactly three public repos, and two of them are the primary sources
  this app was built from:
  - https://github.com/manychat/manychat-api-php — the **official PHP client** (MIT). Confirms the
    base URL and the `Authorization: Bearer` header. Rendered docs:
    https://manychat.github.io/manychat-api-php/
  - https://github.com/manychat/dynamic_block_docs — the **Dynamic Block message format**, i.e. the
    schema for `send-content`'s `data` parameter, which the OpenAPI document declares as a bare
    untyped object. Rendered: https://manychat.github.io/dynamic_block_docs/ · per-channel reference
    for Instagram, WhatsApp and Telegram: https://manychat.github.io/dynamic_block_docs/channels/
  - `github.com/manychat/.github` — org profile metadata only.
- **Status page** — https://status.manychat.com (Instatus) · JSON: `/v2/components.json`,
  `/summary.json`
- **Dead status page, listed so nobody re-discovers it** — `https://manychat.statuspage.io` →
  `/inactive`; its `/api/v2/status.json` returns `401 Your page is inactive.`
- **Help centre** — https://help.manychat.com *(the token-generation article,
  `.../articles/14959510331420-…`, 403s to non-browser clients)*
- **Community forum** — https://community.manychat.com *(source of the two quoted-but-unverified
  behaviours above)*
