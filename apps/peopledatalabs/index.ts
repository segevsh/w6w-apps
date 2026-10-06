import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import enrichPerson from "./actions/enrich-person.ts";
import previewEnrichPerson from "./actions/preview-enrich-person.ts";
import bulkEnrichPersons from "./actions/bulk-enrich-persons.ts";
import identifyPerson from "./actions/identify-person.ts";
import searchPeople from "./actions/search-people.ts";
import enrichCompany from "./actions/enrich-company.ts";
import bulkEnrichCompanies from "./actions/bulk-enrich-companies.ts";
import searchCompanies from "./actions/search-companies.ts";
import enrichIp from "./actions/enrich-ip.ts";
import autocomplete from "./actions/autocomplete.ts";
import cleanCompany from "./actions/clean-company.ts";
import cleanLocation from "./actions/clean-location.ts";
import cleanSchool from "./actions/clean-school.ts";
import enrichJobTitle from "./actions/enrich-job-title.ts";
import searchJobPostings from "./actions/search-job-postings.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * People Data Labs — person and company enrichment and search, built from the v5 reference at
 * docs.peopledatalabs.com. Not covered: the Skill Enrichment API (removed by PDL in April 2025),
 * and the Person Changelog, Person Retrieve and Subject Request APIs.
 */
export default {
  actions: [
    enrichPerson,
    previewEnrichPerson,
    bulkEnrichPersons,
    identifyPerson,
    searchPeople,
    enrichCompany,
    bulkEnrichCompanies,
    searchCompanies,
    enrichIp,
    autocomplete,
    cleanCompany,
    cleanLocation,
    cleanSchool,
    enrichJobTitle,
    searchJobPostings,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
