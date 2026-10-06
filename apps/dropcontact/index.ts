import type { AppDefinition } from "@w6w/types";
import submitEnrichmentBatch from "./actions/submit-enrichment-batch.ts";
import getEnrichmentResult from "./actions/get-enrichment-result.ts";
import enrichContact from "./actions/enrich-contact.ts";
import getCreditsLeft from "./actions/get-credits-left.ts";
import getDefaultWebhook from "./actions/get-default-webhook.ts";
import setDefaultWebhook from "./actions/set-default-webhook.ts";
import deleteDefaultWebhook from "./actions/delete-default-webhook.ts";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Dropcontact — B2B contact enrichment. Findings that shaped this app (2026-10-06):
 *
 * - The API is asynchronous: POST /all returns a request id, GET /all/{id} answers HTTP 200
 *   `success:false` ("not ready") until the batch is done. That is not an error.
 * - There is no balance endpoint: `credits_left` rides on every POST/GET, and an empty
 *   `{"data":[{}]}` POST reads it without spending a credit.
 * - The live host is api.dropcontact.com; api.dropcontact.io is an unrelated API Gateway.
 */
const app: AppDefinition = {
  actions: [
    submitEnrichmentBatch,
    getEnrichmentResult,
    enrichContact,
    getCreditsLeft,
    getDefaultWebhook,
    setDefaultWebhook,
    deleteDefaultWebhook,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
};

export default app;
