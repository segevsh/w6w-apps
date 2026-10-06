import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import verifyEmail from "./actions/verify-email.ts";
import listLists from "./actions/list-lists.ts";
import createList from "./actions/create-list.ts";
import updateList from "./actions/update-list.ts";
import deleteList from "./actions/delete-list.ts";
import listContacts from "./actions/list-contacts.ts";
import findEmailByName from "./actions/find-email-by-name.ts";
import findEmailByLinkedin from "./actions/find-email-by-linkedin.ts";
import listExclusionLists from "./actions/list-exclusion-lists.ts";
import createExclusionList from "./actions/create-exclusion-list.ts";
import getExclusionList from "./actions/get-exclusion-list.ts";
import updateExclusionList from "./actions/update-exclusion-list.ts";
import deleteExclusionList from "./actions/delete-exclusion-list.ts";
import listExcludedDomains from "./actions/list-excluded-domains.ts";
import addExcludedDomains from "./actions/add-excluded-domains.ts";
import removeExcludedDomains from "./actions/remove-excluded-domains.ts";
import intellimatchSearch from "./actions/intellimatch-search.ts";
import intellimatchStatus from "./actions/intellimatch-status.ts";
import intellimatchResults from "./actions/intellimatch-results.ts";
import lookalikeSearch from "./actions/lookalike-search.ts";
import reverseEmailLookup from "./actions/reverse-email-lookup.ts";
import getCompany from "./actions/get-company.ts";
import findEmployees from "./actions/find-employees.ts";
import findPhone from "./actions/find-phone.ts";
import listSignals from "./actions/list-signals.ts";
import getSignal from "./actions/get-signal.ts";
import listMonitors from "./actions/list-monitors.ts";
import createMonitor from "./actions/create-monitor.ts";
import updateMonitor from "./actions/update-monitor.ts";
import deleteMonitor from "./actions/delete-monitor.ts";
import searchTechnologies from "./actions/search-technologies.ts";
import lookupTechnologies from "./actions/lookup-technologies.ts";
import getCredits from "./actions/get-credits.ts";
import getUsage from "./actions/get-usage.ts";
import getTeamUsage from "./actions/get-team-usage.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Findymail — email finder/verifier, phone finder, company and technology lookups, Intellimatch,
 * contact lists, exclusion lists, signal monitors and credit usage, built from the OpenAPI document
 * at app.findymail.com/docs/openapi.yaml. The deprecated `POST /api/search/domain` is not covered.
 */
export default {
  actions: [
    verifyEmail,
    listLists,
    createList,
    updateList,
    deleteList,
    listContacts,
    findEmailByName,
    findEmailByLinkedin,
    listExclusionLists,
    createExclusionList,
    getExclusionList,
    updateExclusionList,
    deleteExclusionList,
    listExcludedDomains,
    addExcludedDomains,
    removeExcludedDomains,
    intellimatchSearch,
    intellimatchStatus,
    intellimatchResults,
    lookalikeSearch,
    reverseEmailLookup,
    getCompany,
    findEmployees,
    findPhone,
    listSignals,
    getSignal,
    listMonitors,
    createMonitor,
    updateMonitor,
    deleteMonitor,
    searchTechnologies,
    lookupTechnologies,
    getCredits,
    getUsage,
    getTeamUsage,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
