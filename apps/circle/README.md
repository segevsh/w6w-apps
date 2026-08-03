# Circle

Manage a [Circle](https://circle.so) community — members, spaces, posts, comments, events and
tags — through the **Circle Admin API v2**.

> **Which Circle.** This is **circle.so, the community platform** (spaces, courses, events,
> paywalled memberships). It is *not* circle.com, the USDC/stablecoin company, whose developer
> portal is `developers.circle.com` and whose status page is `status.circle.com`. Every host,
> link, endpoint and status component in this app was checked against circle.so's own material;
> the disambiguation traps that were actually hit are recorded in
> [Health checks](#health-checks) below, because one of them is subtle enough to fool a probe.

33 actions · 1 auth method · 2 declared health checks (+1 derived) · 188 unit tests.

---

## Links

| | |
|---|---|
| **Website** | <https://circle.so> |
| **API docs** | <https://api.circle.so> — index at [`llms.txt`](https://api.circle.so/llms.txt); every page also serves Markdown by appending `.md` |
| **OpenAPI (Admin v2)** | <https://api-headless.circle.so/api/admin/v2/swagger.yaml> — the ground truth this app was built from |
| **Swagger UI** | <https://api-headless.circle.so/?urls.primaryName=Admin+API+V2> |
| **Status page** | <https://status.circle.so> |
| **Developer community** | <https://community.circle.so/c/developers> |
| **Source / git repo** | **There is no public product or SDK repo.** Circle is closed-source SaaS. Its engineering org is <https://github.com/circleco> — 14 public repos, all internal tooling and forks (`stripe-ruby-mock`, `sidekiq_job_controller`, `pay`, a Rails template), none of them Circle itself or a Circle client. The one published client, the Headless Auth SDK [`@circleco/headless-server-sdk`](https://www.npmjs.com/package/@circleco/headless-server-sdk), declares **no `repository` field** on npm and has no visible source. Listing `circleco` as "the source repo" would be misleading, so it is listed here as what it is: the vendor's engineering org. |

---

## Which API this is, and which it isn't

Circle publishes four API surfaces. They take **different credentials**, and Circle is explicit
that the token types do not cross over — *"Tokens are type-specific as well — for example, Admin
V2 tokens won't work on Headless Auth API. A wrong token type will also result in a 403"*
([Optimizing usage](https://api.circle.so/apis/admin-api/usage-and-limits/optimizing-usage)).

| Surface | Base | Credential | Shipped here |
|---|---|---|:-:|
| **Admin API v2** | `app.circle.so/api/admin/v2` | an **Admin V2** token | ✅ |
| Admin API v1 | `app.circle.so/api/v1` | an **Admin V1** token | ❌ |
| Headless Member API | `api-headless.circle.so` | a per-member JWT | ❌ |
| Headless Auth API | `api-headless.circle.so` | a headless token | ❌ |

### Why v2 only — and it is not just because Circle says so

Circle's own recommendation is clear: *"We **strongly recommend** using the admin API v2 whenever
possible… new endpoints and updates will only be added to our v2 API going forward"*
([Admin API](https://api.circle.so/apis/admin-api)). v1 is not deprecated, but it is frozen.

The harder reason was found on the wire, not in the docs. **v1 answers HTTP 200 for an
authentication failure.** Verified 2026-08-03 against `GET https://app.circle.so/api/v1/me`:

| `Authorization` | HTTP | Body |
|---|---|---|
| *(absent)* | **200** | `{"status":"unauthorized","message":"Your account could not be authenticated."}` |
| `bogus` | **200** | same |
| `Bearer bogus` | **200** | same |

v2 returns a real `401` for the same input. A client that trusts the status line — which is what
`res.ok` means — would treat every v1 auth failure as a success and hand a workflow an error
object shaped like data. Supporting v1 would mean special-casing that in every action, on a
surface Circle has stopped developing, behind a token type that is not interchangeable with this
one anyway. If v1 is ever wanted it belongs in a separate `AuthDefinition` with its own client.

The Headless surfaces are a different product: member-authenticated JWTs for embedding Circle in
your own front end. They are not an admin credential and do not belong in the same App.

---

## Authentication

One field: an **Admin V2** token from **Developers → Tokens** inside the community.

```
Authorization: Bearer <API_Token>
```

### The docs and the OpenAPI spec disagree, and the wire settles it

The spec's `token_auth` security scheme describes the header as `"Authorization header in the
format \"Token AUTH_TOKEN\""`. Every published example uses `Bearer`. Resolved against
`GET https://app.circle.so/api/admin/v2/community`, 2026-08-03:

| `Authorization` | HTTP | Body |
|---|---|---|
| *(absent)* | 401 | `{"success":false,"message":"API token not found."}` |
| `bogus_token_zzz` | 401 | `…"API token not found."` |
| `Bearer bogus_token_zzz` | 401 | `…"The API token is invalid."` |
| `Token bogus_token_zzz` | 401 | `…"The API token is invalid."` |

Two facts. A **scheme word is required** — the bare token is not seen at all, so the server splits
on whitespace and reads the second field. And both scheme words reach validation, so the server
does not care which. `Bearer` is sent, per the documentation; the spec's `Token` wording is stale
prose on a scheme whose only load-bearing part is the header name.

### Scope: one token, one community

*"Your unique API token identifies your community within Circle's server"*
([Quick start](https://api.circle.so/apis/admin-api/quick-start)). There is no account-level or
multi-community token, which is why **nothing in this app takes a community selector** — one
Connection is one community, and two communities means two Connections. `tests/index.test.ts`
asserts no action declares a `community_id`, `host` or `base_url` param.

### One host, no per-tenant base URL

Unlike the sibling `discourse` and `wordpress` apps, there is nothing to parameterise: Circle is
fully vendor-hosted and every community's Admin API is served from `app.circle.so`. Confirmed on
the wire — the request above carried no `host` header and still reached token validation, i.e. it
routed fine. `network.allow` is therefore the single literal `app.circle.so`, not a wildcard.

The v2 spec does declare a second security scheme, an apiKey named `host` in a header, alongside
`token_auth` on every operation. No page of Circle's documentation mentions it and no published
example sends it. Shipping a header whose semantics cannot be verified would be guessing, so this
client does not send one. If a custom-domain community ever needs it, it belongs on the
Connection (it identifies the community, like the token) and never on an Action.

### `test` distinguishes three failures, because they need three fixes

`GET /community` is v2's whoami — there is no `/me`, and the alternatives are collections.

- **401** → the token is wrong, revoked, or the wrong *type*. The message says so, because an
  Admin V1 or Headless token fails identically and the fix is different.
- **403** → the token is fine and the **plan** is not:
  `{"success":false,"message":"The community is not eligible for admin API v2 access."}`. The
  Admin API needs the Business plan or above. Circle's message is surfaced verbatim; collapsing
  it into "auth failed" would send an operator hunting for a bad token.
- anything else → Circle-side.

A listing probe was rejected: it would report a working credential as broken whenever the plan or
the community's settings withheld that collection, and it would pull a page of member PII across
the wire to prove a token works.

---

## Health checks

Two declared checks, plus `auth:api-token` derived automatically from the `test` hook.

### `service` — Circle platform status · live · **default `degraded` severity**

Probes `https://status.circle.so/api/v2/summary.json`.

#### Disambiguation: two of the three obvious status hosts are somebody else's

All verified on the wire 2026-08-03:

| URL | Result |
|---|---|
| `status.circle.so` | 200, `text/html`, 567,805 B — **the real page** |
| `circle.statuspage.io` | 200, a *claimed* Statuspage titled "Circle Status" — but its API returns `{"page":{"id":"zswtg41vp2vd","name":"Circle","url":"https://status.circlebot.xyz"…}` — **a different Circle entirely**, a Discord bot |
| `circleso.statuspage.io` | 200 — after redirecting to `atlassian.com/software/statuspage`, **127,720 B**, md5 `8d3c480a2267` — the known unclaimed-subdomain trap, hit exactly as described |

The middle row is the dangerous one and the reason this check pins a page id rather than trusting
a hostname. `circle.statuspage.io` is not the Atlassian shell — it is a real, claimed, healthy
status page for an unrelated product. A probe pointed at it would report green while circle.so
burned, and nothing in the response would look wrong. (`status.circle.com`, the third obvious
guess, belongs to the payments company.)

#### Verified two ways, because a 200 on a `.json` path proves nothing

**(a) Deliberately bogus siblings on the same host.**

| Path | Result |
|---|---|
| `/api/v2/summary.json` | 200, `application/json`, 6,885 B |
| `/api/v2/status.json` | 200, `application/json`, 211 B |
| `/api/v2/components.json` | 200, `application/json`, 6,772 B |
| `/api/v2/incidents/unresolved.json` | 200, `application/json`, 156 B |
| `/api/v2/notarealthing.json` | **404, 0 bytes, no content-type** |
| `/api/v9/summary.json` | **404, 0 bytes** |
| `/api/v2/summary` *(no suffix)* | **400**, `{"error":…}` |
| `/totally-bogus-zzz` | **404, 0 bytes** |

Four distinct answers across eight paths, each real path a different length. A catch-all returns
one body for everything; this host routes.

**(b) Content-type and body.** `application/json; charset=utf-8`, opening
`{"page":{"id":"qjlztzff1xhv","name":"Circle","url":"https://status.circle.so"…}` over twenty
components that are unmistakably this product: *Communities*, *Posts & Comments*, *Courses*,
*Events*, *Paywalls & Member Billing*, *Live Streams & Rooms*, *Marketing Hub*, *Workflows*,
*Circle iOS App*, *Branded Apps*, and — under a **Developer API** group — *REST API*.

#### Why the verdict is NOT Circle's own indicator

`summary.json` carries a global `status.indicator`, and taking it would be the one-liner. It is
wrong here: that indicator aggregates *Circle iOS App*, *Circle Android App*, *Branded Apps*,
*Circle Discover* and *Circle Help Center* — none of which this app can reach, none of which
affect a workflow, and any of which can go orange without the Admin API missing a beat.

So the state is computed from the **Developer API** component group, the one containing *REST
API*, which is literally what every action calls. All other components are still reported under
`components` for display, and the vendor's indicator is folded into `message`. Nothing is hidden;
it just does not drive the verdict. If Circle renames or removes that group, the check falls back
to the global indicator **and says so in the message** — a silent fallback would mean the check
quietly stops meaning anything.

#### Why severity stays at the default `degraded`

The sibling `discourse` app marks its service check `informational`, because
`status.discourse.org` reports Discourse's *hosting business* and most Discourse forums are
self-hosted and unaffected by it. **That reasoning does not transfer, and the difference is the
point.** There is no self-hosted Circle. Every community's Admin API is served from the single
host `app.circle.so`, and no tenant supplies a host of its own — so a REST API outage on this
page affects every Connection without exception, which is exactly what `degraded` is for. Marking
it informational would suppress a signal that is true for everybody.

What makes the default severity honest is the narrowing above: the check only carries `degraded`
weight for the component this app actually depends on. `tests/index.test.ts` pins both halves of
that decision so it cannot be "harmonised" with the sibling app.

`credential: "none"` (the kind's default) is load-bearing — a third-party status host must never
see a community's Admin token. `network.allow` widens egress to `status.circle.so` for this hook
alone; that host is deliberately absent from the app's own allowlist.

### `quota` — declared **unavailable**, `severity: "informational"`

Circle meters the Admin API twice, and this is unusually consequential
([Usage and limits](https://api.circle.so/apis/admin-api/usage-and-limits)):

1. **A monthly allowance by plan** — Business 5,000/month, Enterprise & Circle Plus 30,000/month,
   Circle Plus Platform 250,000/month. Business works out at roughly **seven requests an hour**.
2. **A rate limit** — *"2000 request per 5 minutes per IP. That number can change at any time."*

And the allowance counts failures. Circle lists the codes that spend it: 200, 201, 204, **400,
401, 403, 404, 405, 422, 429**. Only 5xx is free. That metering is why several design choices in
this app look conservative — required params that Circle's schema marks optional, one-call bulk
forms preferred over loops, and `community-get` deliberately *not* tagged as a health check
because the auth `test` hook already probes the same endpoint.

**Why there is nothing to read**, checked three ways:

1. **No usage endpoint in v2.** The 553,625-byte OpenAPI document (71 paths) contains no path
   matching `usage`, `limit` or `quota`, and declares no rate-limit response header anywhere.
2. **The vendor points at a dashboard, not an API.** *"You can monitor your usage by going to the
   **Developers** tab in your admin area"*, and *"The 'Endpoints overview' section in your
   Developer dashboard…"*. Both sentences describe a web page.
3. **Live response headers carry none.** `GET https://app.circle.so/api/admin/v2/community`
   returned `date`, `content-type`, `content-length`, `server`, `x-frame-options`,
   `cache-control`, `content-security-policy`, `x-request-id`, `x-runtime`,
   `strict-transport-security`, `cf-cache-status`, `set-cookie`, `cf-ray`, `alt-svc` — and no
   `RateLimit-*`, `X-RateLimit-*` or `Retry-After`.
   **Stated precisely:** this was observed on the **401 path**, since this app holds no Circle
   token. It is evidence that the allowance headers are not emitted by the edge or the auth
   middleware — not proof about a 200. Combined with (1) and (2) the conclusion holds, but the
   limit of the evidence is recorded rather than glossed.

Even Circle's own counter is too stale to probe: *"We cache the usage count for one minute on our
side, so you can expect the count to be updated ~5min after performing that call."*

A self-counting probe was rejected: the allowance is **per community**, shared by every
integration holding a token for it (Zapier excepted, which Circle explicitly exempts). Counting
this app's own calls would be right only for a community using nothing else, and the error is
silent and always optimistic.

`severity: "informational"` is load-bearing: an `unavailable` entry reports `unknown`, and
`unknown` outranks `ok` in the roll-up, so at any other severity a declared absence would pin the
App at `unknown` forever.

### Why there is no `dependency` check

Twenty-two apps in this pack add one, because their vendor is addressed by a per-tenant host
(`acme.zendesk.com`, a self-hosted WordPress). Circle has no such thing — one host serves every
tenant — so a `dependency` check here would have to invent a host to probe. `tests/index.test.ts`
asserts its absence, so the gap is a decision rather than an oversight.

---

## Actions

### Members (7)

| Action | Endpoint | Notes |
|---|---|---|
| `member-list` | `GET /community_members` | `status` defaults to `active`, which **excludes** invited-but-unconfirmed members. Tag filter is **OR**, not AND. |
| `member-get` | `GET /community_members/{id}` | The `id` is the community-member id, not the `user_id` also on the record. |
| `member-search` | `GET /community_members/search?email=` | The **only** way to resolve an address to a member id. A separate route, not a filter. |
| `member-invite` | `POST /community_members` | Adds to spaces/groups and applies tags in the **same call**. |
| `member-update` | `PUT /community_members/{id}` | Association lists **REPLACE**. No `email` — an address cannot be changed here. |
| `member-deactivate` | `DELETE /community_members/{id}` | Circle's own summary is *"Deactivate"*. Content stays. |
| `member-ban` | `PUT /community_members/{id}/ban_member` | **Destructive.** See below. |

`member-ban` is quoted verbatim from Circle because the name understates it: *"Ban a community
member and delete all associated records including posts, comments, likes, and chat messages.
This action also bans the member's IP addresses and email."* The v2 document has **no unban
route** among its 71 paths.

### Spaces & membership (7)

`space-list`, `space-get`, `space-create`, `space-group-list`, `space-member-list`,
`space-member-add`, `space-member-remove`.

- `space_type` is fixed at creation and decides what the space can hold. Only a `basic` space
  accepts posts; only an `event` space accepts events.
- `space-create` requires **`name`, `slug` *and* `space_group_id`** — Circle does not derive a
  slug. `space-group-list` exists chiefly so the third one is obtainable.
- `space-member-add` is **additive**; `member-update`'s `space_ids` **replaces**. Different
  endpoints because they mean different things.

### Posts (5) & comments (3)

`post-list`, `post-get`, `post-create`, `post-update`, `post-delete`, `comment-list`,
`comment-create`, `comment-delete`.

The API's sharpest inconsistency lives here and shapes both groups:

- **A post body is a TipTap document.** `POST /posts` has no `body`, no `body_html` and no `raw`
  — only `tiptap_body`, a nested ProseMirror document. `lib/tiptap.ts` builds one from plain
  text (blank line → paragraph, newline → `hardBreak`) and passes a real document through
  untouched for headings, lists, mentions and embeds.
- **A comment body is a plain string.** `POST /comments` types `body` as `{"type":"string"}` —
  and the `comment` schema returns it as an *object*. Written as text, read back as structure.
  Wrapping it "for consistency" would send an object where a string is declared.
- `post-create` takes an author override (`user_email`, Circle's preferred form). **`comment-create`
  has none** — every comment is authored by the token's owner, which is worth knowing before
  wiring up an auto-responder.
- `post-update` runs the body resolver **only when a body param is supplied**, because the update
  schema requires nothing — a settings-only edit must not be rejected with "a body is required".

### Events (5), tags (3), and the rest (3)

`event-list`, `event-get`, `event-attendee-list`, `event-attendee-add`, `event-attendee-remove`,
`member-tag-list`, `tagged-member-add`, `tagged-member-remove`, `community-get`, `message-create`,
`search`.

- `event-list`'s date filters are **literally bracketed keys** — `filter_date[start_date]` and
  `filter_date[end_date]` — not a nested object. Serialising an object produces a key the
  endpoint has never seen and silently filters nothing.
- Circle's default event sort is *"newest (by `created_at`)"*, a real behaviour with **no enum
  token**. Blank is the only way to ask for it, so no default is set.
- `message-create` picks between `user_email` (singular → a DM) and `user_emails` (plural → a
  group chat room) from the recipient count. The schema's `oneOf` makes them different
  properties, not one field that tolerates an array.
- **The three delete-by-identity routes genuinely disagree with each other**, and each is
  transcribed from its own definition rather than from the pattern next door:
  `DELETE /space_members` and `DELETE /tagged_members` take **query parameters**;
  `DELETE /event_attendees` takes a **JSON body**.

### Deliberately not built

| | Why |
|---|---|
| **Admin API v1** | Frozen by the vendor, and answers 200 for auth failures (see above). Needs a different token type anyway. |
| **Headless Member / Auth APIs** | A different product with a different credential (per-member JWTs). Not an admin surface. |
| **`PUT /community_members/{id}/delete_member`** | A permanently destructive route whose blast radius Circle does not document. `member-ban`, whose effects *are* spelled out, covers the case where content must go. |
| **`DELETE /member_tags/{id}`** | Destroys a segmentation primitive other workflows and Circle's paywall rules may depend on. Too much behind one numeric id. |
| **`advanced_search`'s `filters` param** | A query-string object with nested arrays whose bracket encoding the parameter table does not pin down. A guessed serialisation ships a filter that silently does nothing — worse than not offering one. |
| **Anything taking a `signed_id`** | Avatars, cover images and attachments need a token from `POST /direct_uploads`. Nothing an action can synthesise from a URL, so offering the field would only produce 422s. `bodyJson` passes a real signed id through for callers who already have one. |
| **`password` on `member-invite`** | Setting another person's password is not an integration action, and the value would travel as ordinary input rather than as a secret. |
| **Mentions & attachments in `lib/tiptap.ts`** | A mention needs a Rails `sgid` for the member; neither can be derived from an email address. A helper accepting "@alice" would have to invent one. |
| **Courses, forms, access groups, segments, live rooms, flagged content, gamification** | Real v2 surfaces, deliberately out of scope for a first cut. All 71 paths are in the OpenAPI document if they are ever wanted. |

---

## Sandbox posture

- **Network only via `ctx.fetch`**, always through `lib/client.ts`. `tests/index.test.ts` asserts
  no action calls a bare `fetch` and that every action goes through `CircleClient`.
- **No `Deno.*`** in any action.
- **The token appears only in `sign`.** Actions are scanned (comments stripped first, so prose
  explaining the rule does not trip it) for `credential`, `authorization`, `bearer` and
  `api_token`; none may appear in executable code. It is never interpolated into a URL, and the
  client's error messages carry Circle's own `message` field, which the token never reaches.
- **`network.allow: ["app.circle.so"]`** — one literal host, no wildcard. `health/service.ts`
  widens egress to `status.circle.so` for that one unsigned hook.

## Icon

**`assets/icon.svg` is drawn for this pack — it is not a vendor asset.** An upstream mark was
looked for first, as the pack README requires: `n8n`'s `nodes-base` has a `CircleCi` node (a
different product, Circle's CI/CD namesake) and **no circle.so node**, so there was nothing to
port. Circle publishes no downloadable brand kit, and copying a mark off the marketing site would
be reproducing a trademark from a rendering rather than from a licensed asset.

The drawing is a heavy ring with three satellite dots — a community around a centre — in colours
sampled from circle.so's own homepage stylesheet: `#0A0A0A` and the three brand accents `#E35E2C`,
`#C95BCF`, `#3E8DEF`. Replace it if an official mark is ever sourced.

`deno task fmt` is used rather than bare `deno fmt`, because the bare form rewrites
`assets/icon.svg`.

---

## Development

From this directory, via the `api` container (there is no `deno` on the host):

```bash
docker compose -f .devcontainer/docker-compose.yml exec -T api \
  sh -c 'cd /app/packages/apps/apps/circle && deno task check'   # or test / lint / fmt
```

Audit, from `packages/apps`:

```bash
deno run --no-check -A _tools/audit.ts circle
```

> The audit reports one **known false positive** — `entry/import — Import "@w6w/types" not a
> dependency`, raised at `health/service.ts` where `worstHealthState` is imported as a runtime
> *value* rather than a type. It affects 27 apps in this pack, including the just-shipped
> `discourse`, which produces a byte-identical error. Filed as
> `.ai/projects/backlog/26-08-03-02`; do not code around it.

## Verification note

Everything in this README and in the source comments was checked against live vendor material on
**2026-08-03**: the OpenAPI document (553,625 bytes, 71 paths), the prose docs at
`api.circle.so`, and direct HTTP requests to `app.circle.so` and `status.circle.so`. The
distinction between what was read in a document and what was observed on the wire is kept
explicit throughout — particularly in `health/quota.ts`, where the limit of the evidence is
recorded rather than smoothed over.
