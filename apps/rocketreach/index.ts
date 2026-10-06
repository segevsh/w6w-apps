import type { AppDefinition } from "@w6w/types";
import getAccount from "./actions/get-account.ts";
import searchPeople from "./actions/search-people.ts";
import lookupPerson from "./actions/lookup-person.ts";
import checkLookupStatus from "./actions/check-lookup-status.ts";
import bulkLookupPeople from "./actions/bulk-lookup-people.ts";
import searchCompanies from "./actions/search-companies.ts";
import lookupCompany from "./actions/lookup-company.ts";
import verifyEmail from "./actions/verify-email.ts";
import getUniversalAccount from "./actions/get-universal-account.ts";
import universalSearchPeople from "./actions/universal-search-people.ts";
import universalLookupPerson from "./actions/universal-lookup-person.ts";
import universalCheckLookupStatus from "./actions/universal-check-lookup-status.ts";
import universalBulkLookupPeople from "./actions/universal-bulk-lookup-people.ts";
import universalSearchCompanies from "./actions/universal-search-companies.ts";
import universalLookupCompany from "./actions/universal-lookup-company.ts";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * RocketReach — contact and company data API. Findings that shaped this app
 * (2026-10-06):
 *
 * - Two credit systems with two endpoint families: standard
 *   (`/person/lookup`, ...) for Essentials/Pro/Ultimate, and `/universal/...` for
 *   Universal Credits, which the docs say Essentials/Pro/Ultimate cannot use.
 * - `GET /universal/account/` echoes the caller's `api_key`; its action drops it.
 * - Person lookup is asynchronous: `status` other than `complete` means poll.
 * - Auth failures are `401 {detail, error_code: "authentication_failed"}` for both
 *   a missing and a wrong key; the docs' `{status, message}` example is not it.
 */
const app: AppDefinition = {
  actions: [
    getAccount,
    searchPeople,
    lookupPerson,
    checkLookupStatus,
    bulkLookupPeople,
    searchCompanies,
    lookupCompany,
    verifyEmail,
    getUniversalAccount,
    universalSearchPeople,
    universalLookupPerson,
    universalCheckLookupStatus,
    universalBulkLookupPeople,
    universalSearchCompanies,
    universalLookupCompany,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
};

export default app;
