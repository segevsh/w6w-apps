/**
 * Formsite — online forms and surveys, read side plus result webhooks.
 *
 * Built from Formsite's own API article (support.formsite.com, "API"); there
 * is no OpenAPI document. Every account has a numbered server host
 * (`fs3.formsite.com`), so `w6w.network.allow` declares `*.formsite.com` and
 * the server and user directory live on the Connection (see `lib/client.ts`).
 *
 * Deliberately absent: result submission/edit/delete and form creation — the
 * API documents none of them. Results Views and Results Labels are referenced
 * by id only; the API has no endpoint to list them.
 */
import type { AppDefinition } from "@w6w/types";
import token from "./auth/token.ts";

import formList from "./actions/form-list.ts";
import formGet from "./actions/form-get.ts";
import formItemsList from "./actions/form-items-list.ts";
import resultList from "./actions/result-list.ts";
import resultSearch from "./actions/result-search.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import domain from "./health/domain.ts";

export default {
  actions: [
    formList,
    formGet,
    formItemsList,
    resultList,
    resultSearch,
    webhookList,
    webhookCreate,
    webhookDelete,
  ],
  auth: [token],
  healthChecks: [service, domain],
} satisfies AppDefinition;
