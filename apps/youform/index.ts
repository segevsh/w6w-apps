/**
 * Youform — form and survey builder. Read forms and submissions, manage
 * submission webhooks and refill links over `https://app.youform.com/api`.
 *
 * The whole public API is seven operations (account, forms, form, submissions,
 * create/delete webhook, refill link) — source: Youform's Postman collection;
 * see `lib/client.ts`. It cannot create or edit forms, so neither does this app.
 */
import type { AppDefinition } from "@w6w/types";
import accountGet from "./actions/account-get.ts";
import formList from "./actions/form-list.ts";
import formGet from "./actions/form-get.ts";
import submissionList from "./actions/submission-list.ts";
import submissionRefillLinkSet from "./actions/submission-refill-link-set.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import apiToken from "./auth/api-token.ts";
import api from "./health/api.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    accountGet,
    formList,
    formGet,
    submissionList,
    submissionRefillLinkSet,
    webhookCreate,
    webhookDelete,
  ],
  auth: [apiToken],
  healthChecks: [api, service, quota],
} satisfies AppDefinition;
