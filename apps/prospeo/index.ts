import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import enrichPerson from "./actions/enrich-person.ts";
import bulkEnrichPerson from "./actions/bulk-enrich-person.ts";
import enrichCompany from "./actions/enrich-company.ts";
import bulkEnrichCompany from "./actions/bulk-enrich-company.ts";
import searchPerson from "./actions/search-person.ts";
import searchCompany from "./actions/search-company.ts";
import searchSuggestions from "./actions/search-suggestions.ts";
import getAccountInformation from "./actions/get-account-information.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Prospeo — the current (2026) API only: enrich, bulk enrich, search, search suggestions and
 * account information. The retired `/email-finder`, `/email-verifier`, `/mobile-finder`,
 * `/domain-search` and `/social-url-enrichment` endpoints are not in the docs and not built.
 */
export default {
  actions: [
    enrichPerson,
    bulkEnrichPerson,
    enrichCompany,
    bulkEnrichCompany,
    searchPerson,
    searchCompany,
    searchSuggestions,
    getAccountInformation,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
