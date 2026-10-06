import type { AppDefinition } from "@w6w/types";
import accountUsage from "./actions/account-usage.ts";
import companyEnrich from "./actions/company-enrich.ts";
import companyFilterList from "./actions/company-filter-list.ts";
import companyFilterValueList from "./actions/company-filter-value-list.ts";
import companyLookalike from "./actions/company-lookalike.ts";
import companyProspect from "./actions/company-prospect.ts";
import companySearch from "./actions/company-search.ts";
import companySearchAndEnrich from "./actions/company-search-and-enrich.ts";
import companySignalTypeList from "./actions/company-signal-type-list.ts";
import companySignals from "./actions/company-signals.ts";
import contactEnrich from "./actions/contact-enrich.ts";
import contactEnrichJobGet from "./actions/contact-enrich-job-get.ts";
import contactFilterList from "./actions/contact-filter-list.ts";
import contactFilterValueList from "./actions/contact-filter-value-list.ts";
import contactLookalike from "./actions/contact-lookalike.ts";
import contactProspect from "./actions/contact-prospect.ts";
import contactSearch from "./actions/contact-search.ts";
import contactSearchAndEnrich from "./actions/contact-search-and-enrich.ts";
import contactSignalTypeList from "./actions/contact-signal-type-list.ts";
import contactSignals from "./actions/contact-signals.ts";
import subscriptionCreate from "./actions/subscription-create.ts";
import subscriptionDelete from "./actions/subscription-delete.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionList from "./actions/subscription-list.ts";
import apiKey from "./auth/api-key.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

export default {
  actions: [
    accountUsage,
    companyEnrich,
    companyFilterList,
    companyFilterValueList,
    companyLookalike,
    companyProspect,
    companySearch,
    companySearchAndEnrich,
    companySignalTypeList,
    companySignals,
    contactEnrich,
    contactEnrichJobGet,
    contactFilterList,
    contactFilterValueList,
    contactLookalike,
    contactProspect,
    contactSearch,
    contactSearchAndEnrich,
    contactSignalTypeList,
    contactSignals,
    subscriptionCreate,
    subscriptionDelete,
    subscriptionGet,
    subscriptionList,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
