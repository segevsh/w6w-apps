# Salla

Products, orders, customers, categories, brands, discount coupons and store details in Salla, the
Saudi e-commerce platform, over the Merchant API (`api.salla.dev/admin/v2`).

- **Categories** — commerce
- **Auth method** — oauth2 (authorization code, "Custom Mode", `offline_access` for a refresh token)
- **Actions** — 31
- **Health checks** — `service` (Instatus, `Merchant APIs` component), `quota` (`X-RateLimit-*` headers), plus the derived `auth:oauth2`
- **Egress allowlist** — `api.salla.dev` and `accounts.salla.sa` (the status host `status.salla.com` is allowlisted only on the unsigned `service` check)
- **Website** — https://salla.sa
- **API docs** — https://docs.salla.dev (index at https://docs.salla.dev/llms.txt; every endpoint page serves its OpenAPI 3 block when `.md` is appended to its URL)

Everything below was read from the reference and guides on 2026-10-06. **No Salla credential was
available, so no action was exercised against the live API**; the unit tests pin each request's
verb, path, query and body to what the reference documents.

## Connecting

1. Create a free app at [salla.partners](https://salla.partners) and choose **Custom Mode**
   authorization. Note the client id and client secret, and register your redirect URI.
2. Configure those on the w6w installation. The authorization URL is
   `https://accounts.salla.sa/oauth2/auth`, the token URL `https://accounts.salla.sa/oauth2/token`.
3. The connection requests `offline_access` plus `settings.read`, `products.read_write`,
   `orders.read_write`, `customers.read_write`, `categories.read_write`, `brands.read_write` and
   `marketing.read_write`. The scopes granted to the app in the Partners portal decide what the merchant
   is actually asked to approve.

Salla's "Easy Mode" (token delivered to a webhook) is the only mode allowed for apps published on the
Salla App Store; it is not an authorization-code flow a host can drive, so it is not offered here.

## Actions

Each maps to one endpoint. Reads are `read`/`search`; everything that writes is `perform`. Every
action's description names the scope it needs.

| Key | Endpoint | Scope | Retry |
|---|---|---|---|
| `product-list` | `GET /products` | `products.read` | — |
| `product-get` | `GET /products/{product_id}` | `products.read` | — |
| `product-get-by-sku` | `GET /products/sku/{sku}` | `products.read` | — |
| `product-create` | `POST /products` | `products.read_write` | not idempotent |
| `product-update` | `PUT /products/{product_id}` | `products.read_write` | idempotent |
| `product-delete` | `DELETE /products/{product_id}` | `products.read_write` | idempotent |
| `product-change-status` | `POST /products/{product_id}/status` | `products.read_write` | idempotent |
| `order-list` | `GET /orders` | `orders.read` | — |
| `order-get` | `GET /orders/{order_id}` | `orders.read` | — |
| `order-status-list` | `GET /orders/statuses` | `orders.read` | — |
| `order-status-update` | `POST /orders/{order_id}/status` | `orders.read_write` | idempotent |
| `order-history-list` | `GET /orders/{order_id}/histories` | `orders.read` | — |
| `order-history-create` | `POST /orders/{order_id}/histories` | `orders.read_write` | not idempotent |
| `customer-list` | `GET /customers` | `customers.read` | — |
| `customer-get` | `GET /customers/{customer_id}` | `customers.read` | — |
| `customer-create` | `POST /customers` | `customers.read_write` | not idempotent |
| `customer-update` | `PUT /customers/{customer_id}` | `customers.read_write` | idempotent |
| `customer-delete` | `DELETE /customers/{customer_id}` | `customers.read_write` | idempotent |
| `category-list` | `GET /categories` | `categories.read` | — |
| `category-get` | `GET /categories/{category_id}` | `categories.read` | — |
| `category-create` | `POST /categories` | `categories.read_write` | not idempotent |
| `category-update` | `PUT /categories/{category_id}` | `categories.read_write` | idempotent |
| `category-delete` | `DELETE /categories/{category_id}` | `categories.read_write` | idempotent |
| `coupon-list` | `GET /coupons` | `marketing.read` | — |
| `coupon-get` | `GET /coupons/{coupon_id}` | `marketing.read` | — |
| `coupon-create` | `POST /coupons` | `marketing.read_write` | not idempotent |
| `coupon-update` | `PUT /coupons/{coupon_id}` | `marketing.read_write` | idempotent |
| `coupon-delete` | `DELETE /coupons/{coupon_id}` | `marketing.read_write` | idempotent |
| `brand-list` | `GET /brands` | `brands.read` | — |
| `brand-get` | `GET /brands/{brand_id}` | `brands.read` | — |
| `store-info-get` | `GET /store/info` | `settings.read` | — |

Create and update actions take the common documented fields as typed params plus an
**Additional fields** JSON object for the rest of the documented body (variants and options on products,
group and marketer coupons, translations on categories, …). Explicit params win over Additional fields.
List actions return Salla's envelope (`status`, `success`, `data`, `pagination`).

### Left out

- **Brand create/update** — the reference declares the body as `multipart/form-data` with a required
  `logo` upload, which a JSON action cannot send faithfully.
- **Order create, order update, order actions, drafted and external orders** — large nested bodies
  (customer, receiver, shipping, payment) whose exact required combinations the reference does not state;
  left out rather than guessed.
- **Import (products, customers), bulk product actions, product options/variants/images, digital
  products, shipping, branches, special offers, settlements, webhooks** — outside the first-pass scope.
- **The `Store APIs` surface** (storefront-facing) — a different API from the Merchant API.

## Health checks

| Check | What it reads | Notes |
|---|---|---|
| `service` | [`status.salla.com/components.json`](https://status.salla.com/components.json), component `Merchant APIs` (id `clxu9nafz14860ben1rn6d25ig`, pinned by id and name) | Instatus, not Statuspage: `/api/v2/summary.json` is a 404, and `/summary.json` is page-level only (`"status":"UP"`). Statuses are upper-case with no separators (`DEGRADEDPERFORMANCE`, `PARTIALOUTAGE`, `MAJOROUTAGE`, `UNDERMAINTENANCE`). A failing or unreadable status API reports `unknown`, never `down`. |
| `quota` | `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` off a signed `GET /store/info` | Informational. Header presence on error responses is undocumented, so absence reports `unknown`. Customer endpoints have a separate 500-per-10-minutes cap that no header reports. |
| `auth:oauth2` (derived) | `GET https://accounts.salla.sa/oauth2/user/info` | The User Info endpoint needs no resource scope and returns the authorising user and store, never the token. Verdict from the response body: a 401 whose message says the token "should have access to one of those scopes" proves the credential works and passes; "The access token is invalid" fails. |

## Things that would cost a day

- **A 401 is not always a bad token.** A missing scope is a 401 too ("The access token should have
  access to one of those scopes: products.read_write"). Classify the body, not the status.
- **Refresh tokens rotate and are single-use.** Every refresh returns a new refresh token and invalidates
  the previous one; using one twice (two parallel refreshes) revokes the access token and the refresh
  token and fails every later attempt. Access tokens last 14 days, refresh tokens one month. The host must
  serialise refreshes and persist each response.
- **User Info is on `accounts.salla.sa`**, not under `/admin/v2` (the reference page lists the path with
  the `/admin/v2` server, the Authorization guide lists `https://accounts.salla.sa/oauth2/user/info`; this
  app follows the guide).
- **`per_page` maxes out at 60.** Only the product list documents it as a parameter; the Pagination guide
  says every list endpoint takes it, so the list actions expose it and refuse values above 60.
- **Rate limits depend on the store's plan** (Plus 120, Pro 360, Special 720 per minute, then 1 request per
  second), and customers have their own 500 per 10 minutes.
- **Errors carry `success: false` in the body.** Validation failures list `error.fields`; the client
  includes them in the thrown message.
- **`order-get`'s `format` parameter is listed as required in the reference** but the default response is
  documented elsewhere; it is optional here (`light` trims nested objects).
- Required fields on `customer-create` (`first_name`, `last_name`, `mobile`, `mobile_code_country`) come
  from the reference's own validation-error example; the schema itself marks nothing required.
