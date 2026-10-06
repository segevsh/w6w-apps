import type { AppDefinition } from "@w6w/types";
import bulkFindCancel from "./actions/bulk-find-cancel.ts";
import bulkFindDownload from "./actions/bulk-find-download.ts";
import bulkFindRemove from "./actions/bulk-find-remove.ts";
import bulkFindStart from "./actions/bulk-find-start.ts";
import bulkFindStatus from "./actions/bulk-find-status.ts";
import bulkVerifyCancel from "./actions/bulk-verify-cancel.ts";
import bulkVerifyDownload from "./actions/bulk-verify-download.ts";
import bulkVerifyRemove from "./actions/bulk-verify-remove.ts";
import bulkVerifyStart from "./actions/bulk-verify-start.ts";
import bulkVerifyStatus from "./actions/bulk-verify-status.ts";
import checkEmailAttribute from "./actions/check-email-attribute.ts";
import findCompanyDomains from "./actions/find-company-domains.ts";
import findEmail from "./actions/find-email.ts";
import getCredits from "./actions/get-credits.ts";
import getFindEmailStatus from "./actions/get-find-email-status.ts";
import getLimits from "./actions/get-limits.ts";
import getPlans from "./actions/get-plans.ts";
import getVerifyCredits from "./actions/get-verify-credits.ts";
import listFinderLists from "./actions/list-finder-lists.ts";
import listVerifyLists from "./actions/list-verify-lists.ts";
import resolveMx from "./actions/resolve-mx.ts";
import resolveWhois from "./actions/resolve-whois.ts";
import reverseLookupDomain from "./actions/reverse-lookup-domain.ts";
import reverseLookupEmail from "./actions/reverse-lookup-email.ts";
import reverseLookupLinkedin from "./actions/reverse-lookup-linkedin.ts";
import validateName from "./actions/validate-name.ts";
import verifyEmail from "./actions/verify-email.ts";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Clearout — email verification, email finder, reverse lookup and domain utilities.
 * Findings that shaped this app (2026-10-06):
 *
 * - Auth runs before routing and validation: a missing token, a wrong token and a path
 *   that does not exist all answer `401` code 1000, so a 401 proves nothing about a path.
 * - Responses are envelopes (`status: "success" | "failed"`); the client unwraps `data`
 *   and throws on `failed` even under HTTP 200.
 * - The six single-attribute checks live under `/email/verify/…` (slash) while everything
 *   else is `/email_verify/…` (underscore), and the vendor's response schemas for them
 *   are copy-pasted, so their `data` is returned unmapped.
 */
const app: AppDefinition = {
  actions: [
    bulkFindCancel,
    bulkFindDownload,
    bulkFindRemove,
    bulkFindStart,
    bulkFindStatus,
    bulkVerifyCancel,
    bulkVerifyDownload,
    bulkVerifyRemove,
    bulkVerifyStart,
    bulkVerifyStatus,
    checkEmailAttribute,
    findCompanyDomains,
    findEmail,
    getCredits,
    getFindEmailStatus,
    getLimits,
    getPlans,
    getVerifyCredits,
    listFinderLists,
    listVerifyLists,
    resolveMx,
    resolveWhois,
    reverseLookupDomain,
    reverseLookupEmail,
    reverseLookupLinkedin,
    validateName,
    verifyEmail,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
};

export default app;
