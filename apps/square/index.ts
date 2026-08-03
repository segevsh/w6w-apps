/**
 * Square — payments, refunds, orders, customers, catalog, locations and
 * invoices via the Connect v2 API (`connect.squareup.com`, or
 * `connect.squareupsandbox.com` for a sandbox Connection).
 *
 * Every request carries a pinned `Square-Version` header and every list action
 * exposes Square's opaque pagination cursor; see `lib/client.ts` for both, and
 * for how the environment is resolved from the Connection rather than passed
 * per call.
 *
 * Deliberately absent:
 *
 *   - **Webhooks** (`/v2/webhooks/subscriptions`) — that is a Trigger, not an
 *     Action, and belongs in a `triggers/` directory the spec keeps separate.
 *   - **Unlinked refunds** — `RefundPayment` with `unlinked: true` returns money
 *     for a payment Square never processed. It needs `destination_id` +
 *     `location_id`, is gated per account, and is a different operation from
 *     refunding a Square payment. Folding both into one form would make it easy
 *     to refund the wrong thing, so `refund-create` covers linked refunds only.
 *   - **Catalog writes** (`UpsertCatalogObject`, `BatchUpsertCatalogObjects`) —
 *     a catalog object is a deeply nested, type-tagged union (`ITEM` carrying
 *     `item_data.variations[]` carrying `item_variation_data.price_money`, …).
 *     A form cannot express it honestly and a raw-JSON param would just be the
 *     Square API with extra steps. Reads are covered; authoring belongs in
 *     Square's own dashboard.
 *   - **Order create/update/pay** — the same problem one level worse: an Order
 *     is line items, taxes, discounts, service charges, fulfilments and
 *     tenders, with `UpdateOrder` requiring sparse-update field paths plus a
 *     version. `order-search` and `order-get` cover the read surface; a payment
 *     can be attached to an order created elsewhere via `payment-create`'s
 *     `orderId`.
 *   - **Invoice writes** (`CreateInvoice`, `PublishInvoice`, `CancelInvoice`) —
 *     an invoice's payment-request schedule is its own nested model; only the
 *     list is exposed for now, honestly, rather than a partial write.
 *   - **The `custom_url` environment** in Square's spec — a third server
 *     variable for Square's internal proxying. Supporting it would mean a `"*"`
 *     egress allowlist for two documented hosts' worth of benefit.
 *
 * Note there is no `order-get-many`: Square publishes no `GET /v2/orders`.
 * `POST /v2/orders/search` IS the list endpoint, which is why `order-search`
 * exists where every other resource here has a `*-get-many`.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import locationGetMany from "./actions/location-get-many.ts";
import locationGet from "./actions/location-get.ts";
import paymentGetMany from "./actions/payment-get-many.ts";
import paymentGet from "./actions/payment-get.ts";
import paymentCreate from "./actions/payment-create.ts";
import refundGetMany from "./actions/refund-get-many.ts";
import refundGet from "./actions/refund-get.ts";
import refundCreate from "./actions/refund-create.ts";
import orderGet from "./actions/order-get.ts";
import orderSearch from "./actions/order-search.ts";
import customerGetMany from "./actions/customer-get-many.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";
import catalogGetMany from "./actions/catalog-get-many.ts";
import catalogSearchItems from "./actions/catalog-search-items.ts";
import invoiceGetMany from "./actions/invoice-get-many.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // location
    locationGetMany,
    locationGet,
    // payment
    paymentGetMany,
    paymentGet,
    paymentCreate,
    // refund
    refundGetMany,
    refundGet,
    refundCreate,
    // order
    orderGet,
    orderSearch,
    // customer
    customerGetMany,
    customerGet,
    customerCreate,
    customerUpdate,
    // catalog
    catalogGetMany,
    catalogSearchItems,
    // invoice
    invoiceGetMany,
  ],
  auth: [accessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
