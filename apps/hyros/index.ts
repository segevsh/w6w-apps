/**
 * Hyros — ad-attribution platform: push leads, orders, calls, clicks and costs
 * in, read leads, sales, calls, sources and attribution reports out, over the
 * Hyros API v1.0 (`api.hyros.com/v1/api/v1.0`).
 *
 * Every path, parameter and enum was taken from Hyros' API Blueprint
 * (API_DOCS_VERSION 1.37, https://jsapi.apiary.io/apis/hyros.apib — the
 * docs.hyros.com site is a client-rendered shell that names it in its bundle)
 * and checked with live probes of auth behaviour on 2026-10-06.
 *
 * Findings that shaped it:
 *  1. The reference lives on Apiary, not docs.hyros.com; the raw blueprint is the
 *     only machine-readable form.
 *  2. Auth is an `API-Key` header. A missing key answers a bare text/plain 401
 *     `Unauthorized`; a wrong one answers JSON `Api key not valid`, which the
 *     reference also lists under 400 — so validity is judged from the body.
 *  3. Writes answer `{request_id, result:"OK"}` while reads answer `result` as data
 *     plus an opaque `nextPageId` cursor; failures can arrive as `result:"ERROR"`.
 *  4. Array filters are documented as `"a","b"` (double-quoted values).
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import leadsList from "./actions/leads-list.ts";
import leadCreate from "./actions/lead-create.ts";
import leadUpdate from "./actions/lead-update.ts";
import salesList from "./actions/sales-list.ts";
import saleDelete from "./actions/sale-delete.ts";
import orderCreate from "./actions/order-create.ts";
import orderRefund from "./actions/order-refund.ts";
import callsList from "./actions/calls-list.ts";
import callCreate from "./actions/call-create.ts";
import subscriptionsList from "./actions/subscriptions-list.ts";
import productCreate from "./actions/product-create.ts";
import clickCreate from "./actions/click-create.ts";
import customCostCreate from "./actions/custom-cost-create.ts";
import sourcesList from "./actions/sources-list.ts";
import adsList from "./actions/ads-list.ts";
import stagesList from "./actions/stages-list.ts";
import tagsList from "./actions/tags-list.ts";
import attributionGet from "./actions/attribution-get.ts";
import attributionAdAccountGet from "./actions/attribution-ad-account-get.ts";

import service from "./health/service.ts";

export default {
  actions: [
    leadsList,
    leadCreate,
    leadUpdate,
    salesList,
    saleDelete,
    orderCreate,
    orderRefund,
    callsList,
    callCreate,
    subscriptionsList,
    productCreate,
    clickCreate,
    customCostCreate,
    sourcesList,
    adsList,
    stagesList,
    tagsList,
    attributionGet,
    attributionAdAccountGet,
  ],
  auth: [apiKey],
  healthChecks: [service],
} satisfies AppDefinition;
