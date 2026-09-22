/**
 * Credit Repair Cloud — the CRM credit-repair businesses run on: create,
 * update, delete and read Lead/Client records and Affiliate records over the
 * vendor's own Web API (`app.creditrepaircloud.com/api/...`).
 *
 * This is a genuinely tiny API. Credit Repair Cloud documents exactly **eight**
 * endpoints — insert/update/delete/view for Lead/Client records, and the same
 * four for Affiliate records — and this app is exactly those eight, one Action
 * each. Nothing here was inferred from a sibling app, a marketing page or a
 * third-party integration directory; every path, parameter name, enum and error
 * code comes from the vendor's own documentation pages (read in full
 * 2026-09-22) plus live probes against the production host.
 *
 * Four findings shaped the design, each documented in full where it matters:
 *
 *  1. **Two credentials, neither of which is a built-in auth type**
 *     (`auth/credentials.ts`). `apiauthkey` and `secretkey` are two separate
 *     query-string parameters; the built-in `apiKey` type carries one field, one
 *     name and one optional prefix. So the auth method is `type: "custom"` with
 *     two secret fields.
 *  2. **The docs contradict themselves about the request shape, and the wire
 *     settles it** (`lib/client.ts`). The sample URL puts all three parameters
 *     in the query string; the prose says "pass the xmlData as a POST
 *     parameter". Verified live with a real `curl -X POST`: the backend accepts
 *     them from either place. So the credential half lives in the query string
 *     (added only by `sign`) and `xmlData` is the form-encoded POST body —
 *     both documented instructions satisfied at once, with no credential ever
 *     reaching an Action.
 *  3. **The success-response shape is UNVERIFIED** (`lib/client.ts`). The
 *     documentation shows no response body at all; the error envelope was
 *     confirmed live (`<response><success>False</success><result><errors>
 *     <error_no>4406</error_no>...`), but no test account existed to see a
 *     successful `viewRecord`. Every Action therefore returns the generic
 *     envelope — `success`, `errorCode`, `errorMessage`, every direct child of
 *     `<result>` as a flat string map, and the raw XML — and no Action claims a
 *     field name the vendor never showed. This is stated in the README.
 *  4. **The docs' own gaps are filled two different ways** (`actions/`). Where a
 *     field appears in an example but not in that page's Request Parameters
 *     table, it is dropped (`phone_work_ext`, `fax`); where the method cannot
 *     work without it and the vendor's own example carries it, it is required
 *     (`id` on every update/delete/view). Both are recorded in the README, and
 *     the affiliate `zip`-vs-`post_code` split is preserved as the vendor
 *     documents it rather than "corrected".
 *
 * **Deliberately out of scope, because the vendor documents none of it:** there
 * is no list or search Action (`viewRecord` takes a single id; no list endpoint
 * exists anywhere in the docs), no pagination, no webhook/subscription surface,
 * and no quota Action. Error 4409 ("Number of API calls exceeded") proves a rate
 * limit exists, but the vendor publishes no endpoint or header reporting
 * remaining headroom, so no `kind: "quota"` check is declared — see the README.
 */
import type { AppDefinition } from "@w6w/types";

import credentials from "./auth/credentials.ts";

import insertLead from "./actions/insert-lead.ts";
import updateLead from "./actions/update-lead.ts";
import deleteLead from "./actions/delete-lead.ts";
import viewLead from "./actions/view-lead.ts";
import insertAffiliate from "./actions/insert-affiliate.ts";
import updateAffiliate from "./actions/update-affiliate.ts";
import deleteAffiliate from "./actions/delete-affiliate.ts";
import viewAffiliate from "./actions/view-affiliate.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // Lead/Client records
    insertLead,
    updateLead,
    deleteLead,
    viewLead,
    // Affiliate records
    insertAffiliate,
    updateAffiliate,
    deleteAffiliate,
    viewAffiliate,
  ],
  // One method: the vendor has exactly one credential pair, and it is two
  // query-string parameters rather than anything a built-in auth type models.
  auth: [credentials],
  // The vendor's real, actively-maintained Statuspage, plus the `auth:credentials`
  // check the host derives from the `test` hook above. No `quota` check exists,
  // because Credit Repair Cloud publishes nothing to read one from.
  healthChecks: [service],
} satisfies AppDefinition;
