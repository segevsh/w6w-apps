# Judge.me

Collect, moderate and reply to Judge.me product reviews, and manage reviewers, shop settings and
webhooks, on the **Judge.me API v1**.

- **Categories** — commerce, marketing
- **Auth methods** — api-key
- **Actions** — 16
- **Triggers** — 2 (webhook)
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:api-key`
- **Egress allowlist** — `api.judge.me` (the `service` check adds `status.judge.me` to its own hook
  allowlist, never to the app's)
- **Website** — https://judge.me/
- **API docs** — https://judge.me/api/docs (Redoc viewer)
- **OpenAPI** — https://judge.me/api/docs.yaml
- **Status page** — https://status.judge.me/

> **Everything below was verified on 2026-09-05** against Judge.me's own machine-readable OpenAPI 3.0
> document, fetched directly from `https://judge.me/api/docs.yaml` (67,965 bytes,
> `application/x-yaml`) — the Redoc page at `https://judge.me/api/docs` is only a viewer for that
> same file and was never used as a source — plus live probes against `api.judge.me` and
> `status.judge.me`. Nothing here came from a third-party integration directory.

## Triggers

| Trigger | Mechanism | Vendor event | The run gets |
|---|---|---|---|
| `review-created` — New Review | webhook (API-registered, signed) | `review/created` | webhook key, review id when the payload has one, full payload |
| `review-updated` — Review Updated | webhook (API-registered, signed) | `review/updated` | webhook key, review id when the payload has one, full payload |

**Setup.** Subscribing registers the trigger's URL with `POST /webhooks` (`{ "webhook": { "key", "url" } }`) through the connection's API key; unsubscribing deletes exactly that key and URL pair (`DELETE /webhooks`; one Judge.me no longer has counts as deleted). Paste the shop's **Private API token** (the one this connection uses) into the trigger's `signingSecret` param: Judge.me signs webhooks created through the API with it. Judge.me's reference documents the webhook keys but not the delivery body, so the run gets the payload as Judge.me sent it rather than a reshaped record. `review/created_fail` and the `widget/*` keys are not wired.

**Trust model.** Each delivery carries a `JUDGEME-HMAC-SHA256` header (some servers rewrite it to `X-Judgeme-Hmac-SHA256`; both are read): the hex HMAC-SHA256 of the exact request body under the signing secret. The trigger checks it in constant time before it parses anything, and refuses a delivery whose signature is missing or wrong, whose raw body is unavailable, or when no secret is configured. Judge.me's scheme has no timestamp, so there is no freshness window. A webhook created through a Judge.me OAuth app would be signed with that app's secret instead; these triggers register through the API, so use the Private API token.

Docs (verified 2026-11-10): https://judge.me/api/docs.yaml and https://help.judge.me/en/articles/8299679-verifying-webhooks-from-judge-me

## The three things most likely to cost someone a day

### 1. The base host is `api.judge.me`, not `judge.me` — and the auth model is header + query param, not two query params

The document's `servers` block names exactly one server: `https://api.judge.me/api/v1`. `judge.me`
itself only serves the docs page and the OAuth authorize screen; no API call in this app ever
reaches it.

Authentication has two independent, mutually-exclusive shapes, both documented in `info.description`
prose rather than a single reusable scheme:

- **API key** (private or public) — the `X-Api-Token` **header**, always combined with a
  `shop_domain` **query parameter**. Both are required together on every protected path — the header
  alone does not identify a store. This is what `auth/api-key.ts` implements.
- **OAuth2 access token** — `Authorization: Bearer <token>` (or an `api_token` query parameter), with
  the shop derived from the token, so `shop_domain` is not needed. Sending an OAuth token in the
  `X-Api-Token` header instead fails with the same generic error a bad key gets.

**This app implements only the API-key shape.** The document names the OAuth2 authorize URL
(`https://app.judge.me/oauth/authorize`) but publishes **no token endpoint anywhere** — not in
`servers`, not in a security-scheme description, not as a path. `OAuth2Config.tokenUrl` is a required
field in this app's own auth contract, and there is nothing in the document to fill it with, so
OAuth2 is left out rather than guessed.

### 2. One error message covers two unrelated mistakes, and there's no way to tell them apart

Every failure this app observed — live probes and every documented 422/error response in the spec —
is `{"error": "<message>"}`, a plain string, never a nested object. That part is consistent. What
isn't: a wrong `apiKey`, a wrong `shopDomain`, or both together, all produce the **exact same
string**, confirmed live against `api.judge.me`:

```json
{"error":"Failed to authenticate. Shop domain or Api Token is wrong"}
```

`auth/api-key.ts`'s `test` hook reports this message verbatim and says so explicitly, rather than
guessing which of the two fields is actually wrong — because Judge.me's own API doesn't say either.

### 3. The vendor's own OpenAPI document has real authoring errors, independent of anything this app does

Three are worth knowing about before they cost you a debugging session against a document you assume
is internally consistent:

- The review-update path key is **malformed**: `'reviews/{id}':` (`PUT`, no leading slash) sits a few
  lines away from the correctly-slashed `'/reviews/{id}':` used by the `GET` operation. This app's
  `update-review` action uses the correct, slashed form.
- `GET /shops/info`'s only evidence of its response shape is an `example` attached to a
  `requestBody` block — on a `GET` operation that has no request body at all. `get-shop-info.ts`
  sends no body (ignoring the document's own `required: true` on it) and treats the example as the
  best available signal for the response shape, not as gospel.
- `PUT /shops`'s declared request `schema` is `{"type": "string"}`, while its own `example` is a full
  object (`domain`, `email`, `owner`, `phone`, `name`, `country`, `timezone`, `plan`). `update-shop.ts`
  follows the example, since a bare string cannot carry any of those fields.

Several other operations (`reviews/count`, `reviews#create`, `reviewers#data_request`) simply
document **no response schema at all** — a `200` with a description and nothing else. Those actions
return the raw parsed body under a `result` key rather than inventing a shape, and say so in their
own doc comments.

## Rate limits and quota

Judge.me publishes no rate-limit or quota signal of any kind. Checked two ways on 2026-09-05: nothing
in the 67,965-byte OpenAPI document mentions a limit, quota, or `X-RateLimit-*`/`Retry-After` header;
and a live 401 response from `api.judge.me` carries no such header either. `health/quota.ts` declares
this a positive absence (`unavailable`, `severity: "informational"`) rather than guessing at a
ceiling.

## Vendor status

`status.judge.me` is a genuine, claimed Atlassian Statuspage — verified live: `GET
https://status.judge.me/api/v2/summary.json` answers 200, `application/json`, 1,896 bytes (an
unclaimed Statuspage decoy is ~127,700 bytes of HTML), `page.name` is literally `"Judge.me"`. It
carries five components with no groups: `Judge.me Product Reviews - Admin` and
`Judge.me Product Reviews - Storefront widgets` (this app's actual dependencies — there is no
component named "API", so "Admin" is the closest first-party proxy for the REST surface), plus
`AliExpress Review Importer`, `Shopify Admin` and `Shopify Storefront` (other Judge.me
products/dependencies this app never touches). `health/service.ts` reports the worst of the first two
only, so an incident in the unrelated three never degrades this app's verdict.

## Scope

Covers reviews (list/get/count/create/update), reviewers (get/upsert/data request), replies (public
and private), shop info/update, settings, and webhooks — every path the document genuinely declares
under those resources.

Two documented areas are deliberately **out of scope**:

- **Widgets** (`/widgets/*`, 13 endpoints) — render sanitized HTML fragments for embedding directly
  into a storefront page. That's a display/theme concern, not a workflow operation, so none are
  wrapped here.
- **Checkout Comments** (`POST /shops`, `comments#create`) — gated to "the Checkout Comments app
  only" per the document's own description, a separate paid add-on this app has no way to verify
  access to.

The document also carries parameter and schema definitions for `Order`, `LineItem`, and
`DeliveryTracking` (Review Request Email order sync) with **no matching path anywhere in `paths:`**
— orphaned definitions with nothing to call. No actions were built against them.

## Actions

| Action | Type | Endpoint |
| --- | --- | --- |
| `list-reviews` | read | `GET /reviews` |
| `get-review` | read | `GET /reviews/{id}` |
| `count-reviews` | read | `GET /reviews/count` |
| `create-review` | perform (no auth) | `POST /reviews` |
| `update-review` | perform | `PUT /reviews/{id}` |
| `get-reviewer` | read | `GET /reviewers/{id}` |
| `update-reviewer` | perform | `PUT /reviewers/{id}` |
| `request-reviewer-data` | perform | `POST /reviewers/data_request` |
| `get-shop-info` | read | `GET /shops/info` |
| `update-shop` | perform | `PUT /shops` |
| `list-settings` | read | `GET /settings` |
| `create-reply` | perform | `POST /replies` |
| `create-private-reply` | perform | `POST /private_replies` |
| `list-webhooks` | read | `GET /webhooks` |
| `create-webhook` | perform | `POST /webhooks` |
| `delete-webhook` | perform | `DELETE /webhooks` |

## Judge.me ID vs external ID

The document itself calls this out as a recurring source of confusion, and it shows up throughout
this app's params: `id` in a **query parameter or path** is Judge.me's own internal id; `id` in a
**request body** (e.g. `update-reviewer`'s `reviewer.id`) is the store platform's external id
(Shopify, etc). `reviewer`/`product` path lookups also accept `-1` as a sentinel meaning "ignore this
id, use the external-id or email param instead" — `review` lookups do not document that sentinel, so
`get-review`/`update-review` require the real Judge.me internal id.

## Development

```bash
deno task validate   # manifest conformance
deno task check       # typecheck
deno task lint         # deno lint
deno task fmt           # format (deno task fmt, never bare `deno fmt`)
deno task test           # unit tests
```
