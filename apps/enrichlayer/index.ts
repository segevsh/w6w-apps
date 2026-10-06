import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import personProfileGet from "./actions/person-profile-get.ts";
import personLookup from "./actions/person-lookup.ts";
import personRoleLookup from "./actions/person-role-lookup.ts";
import personProfilePictureGet from "./actions/person-profile-picture-get.ts";
import personSearch from "./actions/person-search.ts";
import companyProfileGet from "./actions/company-profile-get.ts";
import companyLookup from "./actions/company-lookup.ts";
import companyIdLookup from "./actions/company-id-lookup.ts";
import companyProfilePictureGet from "./actions/company-profile-picture-get.ts";
import companyEmployeesList from "./actions/company-employees-list.ts";
import companyEmployeeCount from "./actions/company-employee-count.ts";
import companyEmployeeSearch from "./actions/company-employee-search.ts";
import companySearch from "./actions/company-search.ts";
import personalEmailLookup from "./actions/personal-email-lookup.ts";
import workEmailLookup from "./actions/work-email-lookup.ts";
import personalContactNumberLookup from "./actions/personal-contact-number-lookup.ts";
import reversePhoneLookup from "./actions/reverse-phone-lookup.ts";
import reverseEmailLookup from "./actions/reverse-email-lookup.ts";
import disposableEmailCheck from "./actions/disposable-email-check.ts";
import jobProfileGet from "./actions/job-profile-get.ts";
import jobSearch from "./actions/job-search.ts";
import jobCount from "./actions/job-count.ts";
import schoolProfileGet from "./actions/school-profile-get.ts";
import schoolStudentsList from "./actions/school-students-list.ts";
import creditBalanceGet from "./actions/credit-balance-get.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Enrich Layer — every endpoint of the v2 API reference (enrichlayer.com/docs/api/v2) except
 * the deprecated Customers group and the v3 / Autocomplete BETA surfaces.
 */
export default {
  actions: [
    personProfileGet,
    personLookup,
    personRoleLookup,
    personProfilePictureGet,
    personSearch,
    companyProfileGet,
    companyLookup,
    companyIdLookup,
    companyProfilePictureGet,
    companyEmployeesList,
    companyEmployeeCount,
    companyEmployeeSearch,
    companySearch,
    personalEmailLookup,
    workEmailLookup,
    personalContactNumberLookup,
    reversePhoneLookup,
    reverseEmailLookup,
    disposableEmailCheck,
    jobProfileGet,
    jobSearch,
    jobCount,
    schoolProfileGet,
    schoolStudentsList,
    creditBalanceGet,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
