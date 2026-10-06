import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import enrichStart from "./actions/enrich-start.ts";
import enrichGet from "./actions/enrich-get.ts";
import reverseEmailStart from "./actions/reverse-email-start.ts";
import reverseEmailGet from "./actions/reverse-email-get.ts";
import peopleSearch from "./actions/people-search.ts";
import companySearch from "./actions/company-search.ts";
import peopleLookup from "./actions/people-lookup.ts";
import companyLookup from "./actions/company-lookup.ts";
import accountCreditsGet from "./actions/account-credits-get.ts";
import accountVerifyKey from "./actions/account-verify-key.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * FullEnrich — every endpoint of the current v2 API (docs.fullenrich.com,
 * `/api/v2/reference/openapi.yaml`). The older v1 surface is not built.
 */
export default {
  actions: [
    // Enrichment (asynchronous: start + get)
    enrichStart,
    enrichGet,
    reverseEmailStart,
    reverseEmailGet,
    // Search and lookup (synchronous)
    peopleSearch,
    companySearch,
    peopleLookup,
    companyLookup,
    // Account
    accountCreditsGet,
    accountVerifyKey,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
