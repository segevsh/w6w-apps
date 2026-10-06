import type { AppDefinition } from "@w6w/types";
import customerGet from "./actions/customer-get.ts";
import customerList from "./actions/customer-list.ts";
import formGet from "./actions/form-get.ts";
import formList from "./actions/form-list.ts";
import paymentGet from "./actions/payment-get.ts";
import paymentList from "./actions/payment-list.ts";
import apiKey from "./auth/api-key.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

/**
 * MoonClerk — Stripe-backed payment forms: forms, customers ("Plans") and payments.
 * Findings that shaped this app (2026-10-06):
 *
 * - The whole API is READ ONLY (`GET` only), so every action is a `read` or `search`.
 * - A missing or invalid key answers HTTP 401 with a plain-text `HTTP Token: Access denied.`,
 *   not JSON, so the credential check reads the body text.
 * - Lists are enveloped and paged with `count` (1-100) + `offset`, with no total in the reply.
 */
const app: AppDefinition = {
  actions: [customerGet, customerList, formGet, formList, paymentGet, paymentList],
  auth: [apiKey],
  healthChecks: [service, api, quota],
};

export default app;
