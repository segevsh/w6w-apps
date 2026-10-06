/**
 * Baremetrics — SaaS subscription metrics (MRR, ARR, churn, LTV) — over the
 * REST API at `api.baremetrics.com/v1`.
 *
 * Verified 2026-10-06 against developers.baremetrics.com/reference (the
 * per-page OpenAPI definitions) and live probes of `api.baremetrics.com`.
 * The reference marks no endpoint deprecated.
 *
 * Almost every object is scoped by a `source_id` (`GET /v1/{source_id}/…`):
 * call List Sources first. Payment-provider sources are read-only; only data
 * added through the API (the Baremetrics source) can be modified.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import sourcesList from "./actions/sources-list.ts";
import accountGet from "./actions/account-get.ts";
import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerDelete from "./actions/customer-delete.ts";
import customerEventsList from "./actions/customer-events-list.ts";
import planList from "./actions/plan-list.ts";
import planGet from "./actions/plan-get.ts";
import planCreate from "./actions/plan-create.ts";
import planUpdate from "./actions/plan-update.ts";
import planDelete from "./actions/plan-delete.ts";
import subscriptionList from "./actions/subscription-list.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionCreate from "./actions/subscription-create.ts";
import subscriptionUpdate from "./actions/subscription-update.ts";
import subscriptionCancel from "./actions/subscription-cancel.ts";
import subscriptionDelete from "./actions/subscription-delete.ts";
import chargeList from "./actions/charge-list.ts";
import chargeGet from "./actions/charge-get.ts";
import chargeCreate from "./actions/charge-create.ts";
import chargeDelete from "./actions/charge-delete.ts";
import refundList from "./actions/refund-list.ts";
import metricsSummary from "./actions/metrics-summary.ts";
import metricGet from "./actions/metric-get.ts";
import metricCustomers from "./actions/metric-customers.ts";
import metricPlans from "./actions/metric-plans.ts";
import goalsList from "./actions/goals-list.ts";
import annotationsList from "./actions/annotations-list.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    sourcesList,
    accountGet,
    customerList,
    customerGet,
    customerCreate,
    customerUpdate,
    customerDelete,
    customerEventsList,
    planList,
    planGet,
    planCreate,
    planUpdate,
    planDelete,
    subscriptionList,
    subscriptionGet,
    subscriptionCreate,
    subscriptionUpdate,
    subscriptionCancel,
    subscriptionDelete,
    chargeList,
    chargeGet,
    chargeCreate,
    chargeDelete,
    refundList,
    metricsSummary,
    metricGet,
    metricCustomers,
    metricPlans,
    goalsList,
    annotationsList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
