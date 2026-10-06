import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import startIndividualReveal from "./actions/start-individual-reveal.ts";
import getIndividualReveal from "./actions/get-individual-reveal.ts";
import enrichCompany from "./actions/enrich-company.ts";
import searchProspects from "./actions/search-prospects.ts";
import searchCompanies from "./actions/search-companies.ts";
import createList from "./actions/create-list.ts";
import createProspectList from "./actions/create-prospect-list.ts";
import continueProspectSearch from "./actions/continue-prospect-search.ts";
import getList from "./actions/get-list.ts";
import getListContacts from "./actions/get-list-contacts.ts";
import searchLocations from "./actions/search-locations.ts";
import searchTechnologies from "./actions/search-technologies.ts";
import getCredits from "./actions/get-credits.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Wiza — all 13 operations of the published OpenAPI reference (docs.wiza.co): individual
 * reveals, list enrichment, prospect and company search, company enrichment, the two
 * autocomplete helpers and the credit balance.
 */
export default {
  actions: [
    startIndividualReveal,
    getIndividualReveal,
    enrichCompany,
    searchProspects,
    searchCompanies,
    createList,
    createProspectList,
    continueProspectSearch,
    getList,
    getListContacts,
    searchLocations,
    searchTechnologies,
    getCredits,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
