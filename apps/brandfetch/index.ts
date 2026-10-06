import type { AppDefinition } from "@w6w/types";
import getBrand from "./actions/get-brand.ts";
import getBrandByDomain from "./actions/get-brand-by-domain.ts";
import getBrandByTicker from "./actions/get-brand-by-ticker.ts";
import getBrandByIsin from "./actions/get-brand-by-isin.ts";
import getBrandByCrypto from "./actions/get-brand-by-crypto.ts";
import searchBrands from "./actions/search-brands.ts";
import getBrandContext from "./actions/get-brand-context.ts";
import getBrandFromTransaction from "./actions/get-brand-from-transaction.ts";
import getViewer from "./actions/get-viewer.ts";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Brandfetch — brand data API. Findings that shaped this app (2026-10-06):
 *
 * - No credential is `402` (pay-per-request offer), a malformed header `401`, an
 *   unknown key `403`. None of the usual "401 = bad key" holds.
 * - Every `404` is billed; `x-bf-error: crawl_queued` on one means "collecting it
 *   now, retry shortly", surfaced as `crawlQueued`, not an error.
 * - Brand Search authenticates with a client ID (`c`), not the key, and answers
 *   200 even without one. `GET /v2/viewer` is free and returns key usage.
 */
const app: AppDefinition = {
  actions: [
    getBrand,
    getBrandByDomain,
    getBrandByTicker,
    getBrandByIsin,
    getBrandByCrypto,
    searchBrands,
    getBrandContext,
    getBrandFromTransaction,
    getViewer,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
};

export default app;
