/**
 * RegFox — event registration on the Webconnex platform. Search and read orders, registrants,
 * tickets, subscriptions, transactions, customers and memberships, check attendees in and out,
 * manage coupons and webhooks, and read forms and inventory over the Webconnex public API v2
 * (`api.webconnex.com/v2/public`).
 *
 * Every path, parameter and body field was read from https://docs.webconnex.io/api/v2/ and the
 * unauthenticated behaviour was measured live on 2026-10-06. The findings that shaped it:
 *
 *  1. **`/ping` is public** (`auth/api-key.ts`). It answers 200 with no key and with a wrong
 *     one, so the credential probe is `GET /forms?limit=1`.
 *  2. **A wrong key is a 404**, not a 401 (`invalid apiKey`, code 4404); a missing key is 401
 *     (code 4401). Verdicts come from the error body.
 *  3. **The error text is `error.description`**; the reference documents `error.message`.
 *  4. **The form-coupon path is `/coupons/forms/{id}`**: the reference's endpoint table says
 *     `/coupons/form/{id}`, which answers 404 route-not-found.
 *  5. **Webhook reads hold credential material** (`signingSecret`, legacy `token`); list/get
 *     remove both.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import couponCreate from "./actions/coupon-create.ts";
import couponDelete from "./actions/coupon-delete.ts";
import couponGet from "./actions/coupon-get.ts";
import couponListForm from "./actions/coupon-list-form.ts";
import couponListGlobal from "./actions/coupon-list-global.ts";
import customerGet from "./actions/customer-get.ts";
import customerSearch from "./actions/customer-search.ts";
import formGet from "./actions/form-get.ts";
import formInventoryGet from "./actions/form-inventory-get.ts";
import formList from "./actions/form-list.ts";
import membershipGet from "./actions/membership-get.ts";
import membershipSearch from "./actions/membership-search.ts";
import orderGet from "./actions/order-get.ts";
import orderSearch from "./actions/order-search.ts";
import registrantCheckIn from "./actions/registrant-check-in.ts";
import registrantCheckOut from "./actions/registrant-check-out.ts";
import registrantGet from "./actions/registrant-get.ts";
import registrantSearch from "./actions/registrant-search.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionSearch from "./actions/subscription-search.ts";
import ticketGet from "./actions/ticket-get.ts";
import ticketSearch from "./actions/ticket-search.ts";
import transactionGet from "./actions/transaction-get.ts";
import transactionSearch from "./actions/transaction-search.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookLogGet from "./actions/webhook-log-get.ts";
import webhookLogList from "./actions/webhook-log-list.ts";
import webhookResend from "./actions/webhook-resend.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Orders
    orderGet,
    orderSearch,
    // Registrants
    registrantCheckIn,
    registrantCheckOut,
    registrantGet,
    registrantSearch,
    // Tickets
    ticketGet,
    ticketSearch,
    // Subscriptions
    subscriptionGet,
    subscriptionSearch,
    // Transactions
    transactionGet,
    transactionSearch,
    // Customers
    customerGet,
    customerSearch,
    // Memberships
    membershipGet,
    membershipSearch,
    // Forms
    formGet,
    formInventoryGet,
    formList,
    // Coupons
    couponCreate,
    couponDelete,
    couponGet,
    couponListForm,
    couponListGlobal,
    // Webhooks
    webhookCreate,
    webhookDelete,
    webhookGet,
    webhookList,
    webhookLogGet,
    webhookLogList,
    webhookResend,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
