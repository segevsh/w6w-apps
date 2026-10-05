/**
 * Gumroad — creator eCommerce: products, sales, subscribers, license keys, offer
 * codes, variants, checkout custom fields, resource subscriptions (webhooks),
 * refund policy and payouts, over the Gumroad API v2 (`api.gumroad.com`).
 *
 * Every path, verb and parameter was read from Gumroad's own API reference
 * (`gumroad.com/api`, a client-rendered page captured with a headless browser on
 * 2026-10-05). Nothing was exercised against a live account, and nothing came
 * from a third-party integration directory.
 *
 * The findings that shaped the design:
 *
 *  1. **Verify License counts a use by default** (`actions/license-verify.ts`).
 *     `increment_uses_count` defaults to true on Gumroad's side, so a "is this
 *     key valid?" check silently burns one of the buyer's activations. This
 *     app defaults it to false.
 *  2. **Subscribing is a PUT, and the single-subscriber read uses the plural key**
 *     (`actions/resource-subscription-create.ts`, `actions/subscriber-get.ts`).
 *     `PUT /v2/resource_subscriptions` creates the webhook, and `GET
 *     /v2/subscribers/:id` is documented as `{"subscribers": {…}}`, not
 *     `subscriber`.
 *  3. **`success` is the contract** (`lib/client.ts`). Every body, error
 *     included, carries a boolean `success`; the call fails on a non-2xx status
 *     OR `success: false`, and Gumroad's `message` is surfaced verbatim.
 *  4. **Unbounded subscriber lists** (`actions/subscriber-list.ts`). Without
 *     `paginated=true` Gumroad returns every subscriber in one response, so the
 *     action prefills it.
 *
 * Left out (documented, but not wrapped in this version): file uploads
 * (presign/complete/abort), covers, thumbnails, the media library, audience
 * emails, workflows, custom-HTML landing pages, the public product page, and the
 * tax-form PDF download.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import productList from "./actions/product-list.ts";
import productGet from "./actions/product-get.ts";
import productCreate from "./actions/product-create.ts";
import productUpdate from "./actions/product-update.ts";
import productDelete from "./actions/product-delete.ts";
import productEnable from "./actions/product-enable.ts";
import productDisable from "./actions/product-disable.ts";
import reviewList from "./actions/review-list.ts";
import categoryList from "./actions/category-list.ts";
import variantCategoryList from "./actions/variant-category-list.ts";
import variantCategoryGet from "./actions/variant-category-get.ts";
import variantCategoryCreate from "./actions/variant-category-create.ts";
import variantCategoryUpdate from "./actions/variant-category-update.ts";
import variantCategoryDelete from "./actions/variant-category-delete.ts";
import variantList from "./actions/variant-list.ts";
import variantGet from "./actions/variant-get.ts";
import variantCreate from "./actions/variant-create.ts";
import variantUpdate from "./actions/variant-update.ts";
import variantDelete from "./actions/variant-delete.ts";
import offerCodeList from "./actions/offer-code-list.ts";
import offerCodeGet from "./actions/offer-code-get.ts";
import offerCodeCreate from "./actions/offer-code-create.ts";
import offerCodeUpdate from "./actions/offer-code-update.ts";
import offerCodeDelete from "./actions/offer-code-delete.ts";
import customFieldList from "./actions/custom-field-list.ts";
import customFieldCreate from "./actions/custom-field-create.ts";
import customFieldUpdate from "./actions/custom-field-update.ts";
import customFieldDelete from "./actions/custom-field-delete.ts";
import saleList from "./actions/sale-list.ts";
import saleGet from "./actions/sale-get.ts";
import saleMarkShipped from "./actions/sale-mark-shipped.ts";
import saleRefund from "./actions/sale-refund.ts";
import saleRevokeAccess from "./actions/sale-revoke-access.ts";
import saleUndoRevokeAccess from "./actions/sale-undo-revoke-access.ts";
import saleResendReceipt from "./actions/sale-resend-receipt.ts";
import subscriberList from "./actions/subscriber-list.ts";
import subscriberGet from "./actions/subscriber-get.ts";
import licenseVerify from "./actions/license-verify.ts";
import licenseEnable from "./actions/license-enable.ts";
import licenseDisable from "./actions/license-disable.ts";
import licenseDecrementUsesCount from "./actions/license-decrement-uses-count.ts";
import licenseRotate from "./actions/license-rotate.ts";
import resourceSubscriptionList from "./actions/resource-subscription-list.ts";
import resourceSubscriptionCreate from "./actions/resource-subscription-create.ts";
import resourceSubscriptionDelete from "./actions/resource-subscription-delete.ts";
import userGet from "./actions/user-get.ts";
import refundPolicyGet from "./actions/refund-policy-get.ts";
import refundPolicyUpdate from "./actions/refund-policy-update.ts";
import payoutList from "./actions/payout-list.ts";
import payoutGet from "./actions/payout-get.ts";
import payoutUpcoming from "./actions/payout-upcoming.ts";
import earningsGet from "./actions/earnings-get.ts";
import taxFormList from "./actions/tax-form-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // product
    productList,
    productGet,
    productCreate,
    productUpdate,
    productDelete,
    productEnable,
    productDisable,
    reviewList,
    categoryList,
    // variant
    variantCategoryList,
    variantCategoryGet,
    variantCategoryCreate,
    variantCategoryUpdate,
    variantCategoryDelete,
    variantList,
    variantGet,
    variantCreate,
    variantUpdate,
    variantDelete,
    // offer-code
    offerCodeList,
    offerCodeGet,
    offerCodeCreate,
    offerCodeUpdate,
    offerCodeDelete,
    // custom-field
    customFieldList,
    customFieldCreate,
    customFieldUpdate,
    customFieldDelete,
    // sale
    saleList,
    saleGet,
    saleMarkShipped,
    saleRefund,
    saleRevokeAccess,
    saleUndoRevokeAccess,
    saleResendReceipt,
    // subscriber
    subscriberList,
    subscriberGet,
    // license
    licenseVerify,
    licenseEnable,
    licenseDisable,
    licenseDecrementUsesCount,
    licenseRotate,
    // webhook
    resourceSubscriptionList,
    resourceSubscriptionCreate,
    resourceSubscriptionDelete,
    // account
    userGet,
    refundPolicyGet,
    refundPolicyUpdate,
    // payout
    payoutList,
    payoutGet,
    payoutUpcoming,
    earningsGet,
    taxFormList,
  ],
  // Access token only. Gumroad is an OAuth 2 provider, but its reference never
  // states the authorization/token URLs, so no oauth2 method is declared.
  auth: [accessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
