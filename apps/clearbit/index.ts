import type { AppDefinition } from "@w6w/types";
import enrichPerson from "./actions/enrich-person.ts";
import enrichCompany from "./actions/enrich-company.ts";
import enrichCombined from "./actions/enrich-combined.ts";
import companyNameToDomain from "./actions/company-name-to-domain.ts";
import autocompleteCompany from "./actions/autocomplete-company.ts";
import prospectorSearch from "./actions/prospector-search.ts";
import prospectorRevealEmail from "./actions/prospector-reveal-email.ts";
import revealCompanyByIp from "./actions/reveal-company-by-ip.ts";
import calculateRisk from "./actions/calculate-risk.ts";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    enrichPerson,
    enrichCompany,
    enrichCombined,
    companyNameToDomain,
    autocompleteCompany,
    prospectorSearch,
    prospectorRevealEmail,
    revealCompanyByIp,
    calculateRisk,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
