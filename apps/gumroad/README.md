# Gumroad

Manage a Gumroad seller account — products, sales, subscribers, license keys, offer codes, variants,
checkout custom fields, refund policy, payouts and earnings — and register webhooks (resource
subscriptions) for sales, refunds, disputes and subscription changes, on the **Gumroad API v2**
(`https://api.gumroad.com/v2`).

**53 actions**, one access-token auth method, two declared health checks.

- **Triggers** — 16 (poll, webhook)

## Provenance

Every path, verb and parameter comes from Gumroad's own API reference (`https://gumroad.com/api`).
That page is client-rendered, so a plain fetch returns an empty shell; it was captured with a headless
browser on 2026-10-05. **Nothing was exercised against a live account** (no credential was available),
so each claim below is "documented", not "measured".

## Auth

`access-token` (`bearer`): paste the token from your Gumroad application page (Settings > Advanced >
Applications > *Generate access token*). It is sent as `Authorization: Bearer <token>` by `sign` and
never as the `access_token` form/query parameter the reference's cURL examples use, because a host logs
URLs and does not log headers. The reference documents the Bearer header explicitly only on its
custom-HTML sections; that every other endpoint accepts it is inferred (Gumroad is a standard OAuth 2
provider), and the connect-time `test` exercises it against `/v2/user`.

**No OAuth2 method.** The reference never states the authorization or token URLs (it links to a
separate guide), so none is declared. A token carries its application's scopes: `account` (most
endpoints), `view_profile`, `edit_products`, `edit_emails`, `view_sales`, `view_payouts`,
`view_tax_data`, `mark_sales_as_shipped`, `edit_sales`. Each action's description names the scope it
needs; endpoints with a narrower security boundary refuse an `account`-only token.

**The probe is `GET /v2/user`.** Its documented body is profile data (`bio`, `name`, `twitter_handle`,
`user_id`, `url`, `profile_picture_url`, plus `email` with `view_sales`) — it does not echo the
credential, and any read scope reaches it. `test` classifies from the body (`success`), not the status.
`afterConnect` keeps only `name` and `user_id` for the connection label.

## Health checks

- `auth:access-token` — derived from `test` (above).
- `service` — declared absence, `informational`. `status.gumroad.com` is real but is a hand-built HTML
  incident list ("Live from Pingdom", six surfaces including `API`) with no JSON and no Atom/RSS:
  `/api/v2/summary.json`, `/index.json` and `/history.atom` all return 404.
- `quota` — declared absence, `informational`. No rate limit, meter or rate-limit header is documented
  for the wrapped endpoints.

## Things that cost a day if you miss them

- **Verify License counts a use by default.** `increment_uses_count` defaults to true, so a validity
  check burns one of the buyer's activations. `license-verify` sends `false` unless you opt in.
- **Subscribing is `PUT /v2/resource_subscriptions`**, not POST. Resource names: `sale`, `refund`,
  `dispute`, `dispute_won`, `cancellation`, `subscription_updated`, `subscription_ended`,
  `subscription_restarted`. Subscribing to `sale` needs `view_sales`.
- **`GET /v2/subscribers/:id` is documented as `{"subscribers": {…}}`** (plural key, single object).
  `subscriber-get` accepts either key.
- **Subscriber lists are unbounded** unless `paginated=true`; the action prefills it.
- **`success` is the contract.** Every error is `{"success": false, "message": …}`; the client fails on a
  non-2xx status or on `success: false` and surfaces `message` verbatim.
- **Writes are form-encoded** (every documented example is `curl -d`), booleans are the strings
  `"true"`/`"false"`, arrays are `tags[]=a&tags[]=b`. A JSON `false` is not the documented `"false"`.
- **Ids end in `==`** and are percent-encoded as one path segment.
- **Custom field `required` is returned as a string** (`"false"`) in the reference examples, and custom
  fields are addressed by *name* in the path.
- **`price` is in the smallest currency unit**; `jpy` has no minor unit. A refund's `amount_cents` is in
  the sale's own `currency`, not the buyer's.
- **Creating a product may silently save a draft** (unconfirmed email, no payout method) and returns a
  `warning` rather than an error; publish later with `product-enable`.
- **`PUT /v2/products/:id` replaces `tags`** (and `files`/`rich_content`) wholesale.
- **Variant-category/variant write bodies are sent flat** (`title=…`, `name=…`), as the cURL examples
  show; the parameter list names a `variant_category`/`variant` wrapper, which the examples do not use.

## Actions

| Resource | Action | Type | Endpoint |
|---|---|---|---|
| account | `refund-policy-get` (Get Refund Policy) | read | `GET /v2/refund_policy` |
| account | `refund-policy-update` (Update Refund Policy) | perform | `PUT /v2/refund_policy` |
| account | `user-get` (Get User) | read | `GET /v2/user` |
| custom-field | `custom-field-create` (Create Custom Field) | perform | `POST /v2/products/:product_id/custom_fields` |
| custom-field | `custom-field-delete` (Delete Custom Field) | perform | `DELETE /v2/products/:product_id/custom_fields/:name` |
| custom-field | `custom-field-list` (List Custom Fields) | read | `GET /v2/products/:product_id/custom_fields` |
| custom-field | `custom-field-update` (Update Custom Field) | perform | `PUT /v2/products/:product_id/custom_fields/:name` |
| license | `license-decrement-uses-count` (Decrement License Uses) | perform | `PUT /v2/licenses/decrement_uses_count` |
| license | `license-disable` (Disable License) | perform | `PUT /v2/licenses/disable` |
| license | `license-enable` (Enable License) | perform | `PUT /v2/licenses/enable` |
| license | `license-rotate` (Rotate License Key) | perform | `PUT /v2/licenses/rotate` |
| license | `license-verify` (Verify License) | perform | `POST /v2/licenses/verify` |
| offer-code | `offer-code-create` (Create Offer Code) | perform | `POST /v2/products/:product_id/offer_codes` |
| offer-code | `offer-code-delete` (Delete Offer Code) | perform | `DELETE /v2/products/:product_id/offer_codes/:offerCodeId` |
| offer-code | `offer-code-get` (Get Offer Code) | read | `GET /v2/products/:product_id/offer_codes/:offerCodeId` |
| offer-code | `offer-code-list` (List Offer Codes) | read | `GET /v2/products/:product_id/offer_codes` |
| offer-code | `offer-code-update` (Update Offer Code) | perform | `PUT /v2/products/:product_id/offer_codes/:offerCodeId` |
| payout | `earnings-get` (Get Annual Earnings) | read | `GET /v2/earnings` |
| payout | `payout-get` (Get Payout) | read | `GET /v2/payouts/:payoutId` |
| payout | `payout-list` (List Payouts) | read | `GET /v2/payouts` |
| payout | `payout-upcoming` (List Upcoming Payouts) | read | `GET /v2/payouts/upcoming` |
| payout | `tax-form-list` (List Tax Forms) | read | `GET /v2/tax_forms` |
| product | `category-list` (List Categories) | read | `GET /v2/categories` |
| product | `product-create` (Create Product) | perform | `POST /v2/products` |
| product | `product-delete` (Delete Product) | perform | `DELETE /v2/products/:product_id` |
| product | `product-disable` (Unpublish Product) | perform | `PUT /v2/products/:product_id/disable` |
| product | `product-enable` (Publish Product) | perform | `PUT /v2/products/:product_id/enable` |
| product | `product-get` (Get Product) | read | `GET /v2/products/:product_id` |
| product | `product-list` (List Products) | read | `GET /v2/products` |
| product | `product-update` (Update Product) | perform | `PUT /v2/products/:product_id` |
| product | `review-list` (List Product Reviews) | read | `GET /v2/products/:product_id/reviews` |
| sale | `sale-get` (Get Sale) | read | `GET /v2/sales/:saleId` |
| sale | `sale-list` (List Sales) | read | `GET /v2/sales` |
| sale | `sale-mark-shipped` (Mark Sale Shipped) | perform | `PUT /v2/sales/:saleId/mark_as_shipped` |
| sale | `sale-refund` (Refund Sale) | perform | `PUT /v2/sales/:saleId/refund` |
| sale | `sale-resend-receipt` (Resend Receipt) | perform | `POST /v2/sales/:saleId/resend_receipt` |
| sale | `sale-revoke-access` (Revoke Sale Access) | perform | `PUT /v2/sales/:saleId/revoke_access` |
| sale | `sale-undo-revoke-access` (Restore Sale Access) | perform | `PUT /v2/sales/:saleId/undo_revoke_access` |
| subscriber | `subscriber-get` (Get Subscriber) | read | `GET /v2/subscribers/:subscriberId` |
| subscriber | `subscriber-list` (List Subscribers) | read | `GET /v2/products/:product_id/subscribers` |
| variant | `variant-category-create` (Create Variant Category) | perform | `POST /v2/products/:product_id/variant_categories` |
| variant | `variant-category-delete` (Delete Variant Category) | perform | `DELETE /v2/products/:product_id/variant_categories/:variantCategoryId` |
| variant | `variant-category-get` (Get Variant Category) | read | `GET /v2/products/:product_id/variant_categories/:variantCategoryId` |
| variant | `variant-category-list` (List Variant Categories) | read | `GET /v2/products/:product_id/variant_categories` |
| variant | `variant-category-update` (Update Variant Category) | perform | `PUT /v2/products/:product_id/variant_categories/:variantCategoryId` |
| variant | `variant-create` (Create Variant) | perform | `POST /v2/products/:product_id/variant_categories/:variantCategoryId/variants` |
| variant | `variant-delete` (Delete Variant) | perform | `DELETE /v2/products/:product_id/variant_categories/:variantCategoryId/variants/:variantId` |
| variant | `variant-get` (Get Variant) | read | `GET /v2/products/:product_id/variant_categories/:variantCategoryId/variants/:variantId` |
| variant | `variant-list` (List Variants) | read | `GET /v2/products/:product_id/variant_categories/:variantCategoryId/variants` |
| variant | `variant-update` (Update Variant) | perform | `PUT /v2/products/:product_id/variant_categories/:variantCategoryId/variants/:variantId` |
| webhook | `resource-subscription-create` (Subscribe to Resource) | perform | `PUT /v2/resource_subscriptions` |
| webhook | `resource-subscription-delete` (Unsubscribe from Resource) | perform | `DELETE /v2/resource_subscriptions/:resourceSubscriptionId` |
| webhook | `resource-subscription-list` (List Resource Subscriptions) | read | `GET /v2/resource_subscriptions` |

Lists that Gumroad paginates (`review-list`, `sale-list`, `subscriber-list`, `payout-list`) return
`nextPageKey` (null on the last page); pass it back as **Page key**.

## Left out

Documented but not wrapped in this version: file uploads (`/files/presign`, `/complete`, `/abort`),
covers, thumbnails, the media library, audience emails and workflows, custom-HTML landing pages
(product and profile), `rich_content`/`files`/`cover_ids` on product create/update, the public product
page (`<seller>.gumroad.com/l/<permalink>.json`, a different host) and the tax-form PDF download
(binary response). The Gumroad "Ping" webhook payload format is on a separate page not captured here;
`resource-subscription-create` registers the URL but this app does not parse the POST.

## Icon

`assets/icon.svg` is the simple-icons Gumroad mark, downloaded verbatim from
`https://cdn.jsdelivr.net/npm/simple-icons/icons/gumroad.svg` (504 bytes). `assets/icon.dark.svg` is the
same file with `fill="#ffffff"` added on the root element (the pack's convention for a mark that is
illegible on the dark tile); the audit requires it.

## Layout

```
auth/access-token.ts   bearer token; sign / test / afterConnect
lib/client.ts          GumroadClient: success-flag errors, form encoding, seg(), toList()
actions/               one file per action
health/                service.ts, quota.ts (both declared absences)
tests/                 index, auth, client, health, defaults + one test file per action
```

`deno task fmt && deno task validate && deno task check && deno task lint && deno task test`

## Triggers

| Key | Title | Mechanism | Wrapped action | What the run gets |
| --- | --- | --- | --- | --- |
| `new-sale` | New Sale | poll | `sale-list` (Gumroad returns sales newest first) | Each new sale |
| `sale-webhook` | New Sale (Webhook) | webhook | `sale` resource | Each delivered sale |
| `sale-refunded` | Sale Refunded | webhook | `refund` resource | Each refunded sale |
| `dispute-raised` | Dispute Raised | webhook | `dispute` resource | Each dispute raised against a sale |
| `dispute-won` | Dispute Won | webhook | `dispute_won` resource | Each dispute the seller wins |
| `subscription-cancelled` | Subscription Cancelled | webhook | `cancellation` resource | Each membership cancellation |
| `subscription-updated` | Subscription Updated | webhook | `subscription_updated` resource | Each upgrade or downgrade |
| `subscription-ended` | Subscription Ended | webhook | `subscription_ended` resource | Each membership that has ended |
| `subscription-restarted` | Subscription Restarted | webhook | `subscription_restarted` resource | Each restarted membership |
| `any-event` | Any Event | webhook | all 8 resources, or the `events` list | The delivered fields plus `resource_name` |
| `new-product` | New Product | poll | `product-list` (whole catalogue in one request) | Each new product |
| `new-offer-code` | New Offer Code | poll | `offer-code-list` (all codes of a product in one request) | Each new offer code on a product |
| `new-variant-category` | New Variant Category | poll | `variant-category-list` (all categories of a product in one request) | Each new variant category |
| `new-variant` | New Variant | poll | `variant-list` (all variants of a category in one request) | Each new variant |
| `new-review` | New Review | poll | `review-list` (reference: newest first) | Each new written review on a product |
| `new-payout` | New Payout | poll | `payout-list` with `after=` (since-filter window) | Each new payout (not the upcoming one) |

**Webhooks.** Each webhook trigger registers its own resource subscription
(`PUT /v2/resource_subscriptions`), removes callback-URL leftovers first, stores the ids and deletes
them on unsubscribe. **Any Event** takes an `events` param (comma-separated resource names, empty =
all eight; `sale,refund,dispute,dispute_won,cancellation,subscription_updated,subscription_ended,subscription_restarted`)
and registers one subscription per name; it tags each registration with a `w6w_resource` query
parameter on the callback URL so the delivery says which resource it is (`resource_name`).
Gumroad documents that resource-subscription notifications are **not signed** (the signing secret
in account settings covers only the Ping URL), so the private callback URL is the secret. Deliveries
are at least once and unordered: de-duplicate on `sale_id` plus `resource_name`.

**Polls.** The product, offer code, variant category and variant lists return the whole collection
in one request (no paging parameters), so each is a snapshot that reports rows added after the
first check. `new-payout` filters by `after` (a date) and follows `page_key` across checks, so a
long window is drained over several checks and payouts created before the trigger started are never
emitted.

Not covered as triggers: `category-list` (static product taxonomy), `custom-field-list` (checkout
field definitions), `tax-form-list` (US tax-form report output), `resource-subscription-list`
(webhook subscription management), and `subscriber-list` (the reference gives no order or
since-filter and returns every active subscriber; use the `subscription_*` and `cancellation` webhook
triggers for membership changes).

Vendor mechanism: <https://gumroad.com/api> and <https://gumroad.com/ping> (verified 2026-11-10).
