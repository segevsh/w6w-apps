/**
 * ThriveCart — the cart, checkout and affiliate platform: read products,
 * bump/upsell/downsell offers, transactions, customers and affiliates, and
 * manage subscriptions, affiliates, Learn students and webhook subscriptions
 * over ThriveCart's REST API.
 *
 * Every path, method, header and field in this app was verified on
 * 2026-08-15 against ThriveCart's own published Postman collection
 * (`https://apidocs.thrivecart.com/api/collections/13408532/TVejhANr`,
 * 93,209 bytes, 33 documented requests), the vendor's open-source PHP SDK
 * (`github.com/thrivecart/php-api`) and `github.com/thrivecart/api-demo`,
 * plus live probes against `thrivecart.com` the same day. Nothing here came
 * from a third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The base host is `thrivecart.com`, not `api.thrivecart.com`** — the
 *     latter 404s. There is no per-tenant API host; every account is called
 *     through the same fixed origin with an `/api/external` prefix. See
 *     `lib/client.ts`.
 *  2. **The documented 401 shape is not the one a real bad credential
 *     produces.** The collection shows `{"error": "invalid_token",
 *     "error_description": "..."}`, and that shape IS real — but only for a
 *     bearer value with no hyphen in it. Real ThriveCart access tokens are
 *     hyphenated (`XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX`, per
 *     `thrivecart/api-demo`'s own form placeholder), and a hyphenated bad
 *     token instead answers `{"error": "auth.invalid"}` or
 *     `{"error": "auth.incorrect"}` — an undocumented shape with no
 *     `error_description` and no `WWW-Authenticate` header. See
 *     `lib/client.ts` and `auth/api-token.ts`.
 *  3. **No status page, no quota signal.** `status.thrivecart.com` 404s and
 *     no page links a status surface; no response observed anywhere carried
 *     a rate-limit header. Both health checks declare absence rather than
 *     guess. See `health/`.
 *  4. **Several "read" endpoints are `POST`s.** Read Customer Information and
 *     Read Affiliate Info take their lookup key in a POST body rather than a
 *     query string or path segment. They are still typed `read` here — one
 *     record, no side effect, matching the RFC's semantics rather than the
 *     HTTP verb the vendor happened to pick.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import accountGet from "./actions/account-get.ts";

import productList from "./actions/product-list.ts";
import productGet from "./actions/product-get.ts";
import productPricingGet from "./actions/product-pricing-get.ts";

import bumpList from "./actions/bump-list.ts";
import bumpGet from "./actions/bump-get.ts";
import bumpPricingGet from "./actions/bump-pricing-get.ts";

import upsellList from "./actions/upsell-list.ts";
import upsellGet from "./actions/upsell-get.ts";
import upsellPricingGet from "./actions/upsell-pricing-get.ts";

import downsellList from "./actions/downsell-list.ts";
import downsellGet from "./actions/downsell-get.ts";
import downsellPricingGet from "./actions/downsell-pricing-get.ts";

import transactionSearch from "./actions/transaction-search.ts";
import transactionRefund from "./actions/transaction-refund.ts";

import customerGet from "./actions/customer-get.ts";
import customerEmailUpdate from "./actions/customer-email-update.ts";

import subscriptionCancel from "./actions/subscription-cancel.ts";
import subscriptionPause from "./actions/subscription-pause.ts";
import subscriptionResume from "./actions/subscription-resume.ts";

import affiliateSearch from "./actions/affiliate-search.ts";
import affiliateGet from "./actions/affiliate-get.ts";
import affiliateCreate from "./actions/affiliate-create.ts";
import affiliateFavorite from "./actions/affiliate-favorite.ts";
import affiliateUnfavorite from "./actions/affiliate-unfavorite.ts";
import affiliateRegister from "./actions/affiliate-register.ts";
import affiliateApprove from "./actions/affiliate-approve.ts";
import affiliateReject from "./actions/affiliate-reject.ts";
import affiliateCustomCommissionsSet from "./actions/affiliate-custom-commissions-set.ts";
import affiliateDelete from "./actions/affiliate-delete.ts";

import studentCreate from "./actions/student-create.ts";

import webhookSubscribe from "./actions/webhook-subscribe.ts";
import webhookUnsubscribe from "./actions/webhook-unsubscribe.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    accountGet,
    // Products
    productList,
    productGet,
    productPricingGet,
    // Bump offers
    bumpList,
    bumpGet,
    bumpPricingGet,
    // Upsells
    upsellList,
    upsellGet,
    upsellPricingGet,
    // Downsells
    downsellList,
    downsellGet,
    downsellPricingGet,
    // Transactions
    transactionSearch,
    transactionRefund,
    // Customers
    customerGet,
    customerEmailUpdate,
    // Subscriptions
    subscriptionCancel,
    subscriptionPause,
    subscriptionResume,
    // Affiliates
    affiliateSearch,
    affiliateGet,
    affiliateCreate,
    affiliateFavorite,
    affiliateUnfavorite,
    affiliateRegister,
    affiliateApprove,
    affiliateReject,
    affiliateCustomCommissionsSet,
    affiliateDelete,
    // Learn
    studentCreate,
    // Webhooks
    webhookSubscribe,
    webhookUnsubscribe,
  ],
  // Access token only. The collection documents a bearer credential; a
  // separate OAuth2 app flow exists for third-party apps but is not part of
  // the published collection this app was built from — see auth/api-token.ts.
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
