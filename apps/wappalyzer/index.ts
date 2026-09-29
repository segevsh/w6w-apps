/**
 * Wappalyzer — website technology intelligence: look up the stack behind up
 * to ten URLs, discover a company's serving subdomains, verify an email
 * address, and build technographic lead lists, over the Wappalyzer Public API
 * v2 (`api.wappalyzer.com`).
 *
 * Every path, header, query parameter, request/response field and error
 * shape in this app was verified on 2026-09-29 against Wappalyzer's own
 * published OpenAPI 3.1 contract (`www.wappalyzer.com/openapi/v2-public.yaml`,
 * `info.version: v2`) — cross-read against the human-authored reference pages
 * it was generated from — plus live probes against `api.wappalyzer.com` and
 * `status.wappalyzer.com`. Nothing here came from a third-party integration
 * directory.
 *
 * Three findings that shaped this app, each documented in full where it
 * matters:
 *
 *  1. **A missing key and a wrong key answer identically** (`auth/api-key.ts`,
 *     `lib/client.ts`). Three requests to the same endpoint — no `x-api-key`
 *     header, a fake key, and a bearer-style `Authorization` header instead —
 *     all returned the byte-identical `403 {"message":"Forbidden"}`
 *     (`x-amzn-errortype: ForbiddenException`). This is not a shortcut taken
 *     in this app's error handling; it is what Wappalyzer's own gateway sends,
 *     and the vendor's Basics page confirms it structurally: `403` is
 *     documented as one bucket ("incorrect API key, invalid method or
 *     resource, or insufficient credits"), not three distinguishable cases.
 *  2. **Collection endpoints carry a trailing slash; item endpoints never do**
 *     (`lib/client.ts`). Every worked example for `GET /v2/lookup/`,
 *     `/v2/subdomains/`, `/v2/verify/`, `/v2/credits/balance/` and
 *     `GET|POST /v2/lists/` carries the slash; `GET|POST|DELETE
 *     /v2/lists/{id}` never does. The OpenAPI document's own `paths` keys
 *     omit it everywhere, which is why this app follows the human docs'
 *     worked examples rather than the machine paths verbatim.
 *  3. **No vendor-stated credit ceiling exists** (`health/quota.ts`).
 *     `GET /v2/credits/balance/` returns a raw `{"credits": N}` balance with
 *     no plan size or reset date anywhere in the documented API, so the quota
 *     health check reports remaining credits only — never a fabricated
 *     percentage.
 *
 * A `Business` plan or higher is required for API access, per every
 * reference page's own gating banner — this app does not change what it
 * builds based on that, since the documented contract is identical regardless
 * of plan tier.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import lookup from "./actions/lookup.ts";
import subdomainsList from "./actions/subdomains-list.ts";
import verifyEmail from "./actions/verify-email.ts";
import creditsBalanceGet from "./actions/credits-balance-get.ts";
import listsList from "./actions/lists-list.ts";
import listsGet from "./actions/lists-get.ts";
import listsCreate from "./actions/lists-create.ts";
import listsFinalize from "./actions/lists-finalize.ts";
import listsDelete from "./actions/lists-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Lookup
    lookup,
    // Subdomains
    subdomainsList,
    // Verify
    verifyEmail,
    // Lead lists
    listsList,
    listsGet,
    listsCreate,
    listsFinalize,
    listsDelete,
    // Account
    creditsBalanceGet,
  ],
  // API key only. Wappalyzer publishes no OAuth surface for third-party apps —
  // the key is the whole authentication story.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
