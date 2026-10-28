/**
 * Zoho Sign — e-signature workflows over the Zoho Sign REST API
 * (`https://sign.zoho.com/api/v1/...`, and its nine regional siblings).
 *
 * Every path, verb, body shape and error code in this app was verified on 2026-09-29 against
 * Zoho's own documentation under `https://www.zoho.com/sign/api/` and live probes against all
 * ten regional API hosts and their accounts hosts (see `lib/regions.ts`, `lib/client.ts`).
 * That left-nav is client-rendered and the pages are not indexed/sitemapped, so each was
 * located via the Wayback Machine's CDX index of that path and then fetched live — nothing
 * here came from a third-party integration directory or was guessed from URL patterns alone.
 *
 * The findings that shaped the design, each documented in full where it matters:
 *
 *  1. **Zoho Sign has its own dedicated API host, `sign.zoho.<tld>` — NOT the shared
 *     `www.zohoapis.<tld>` gateway `zohobooks`/`zoho` (CRM) use** (`lib/regions.ts`,
 *     `lib/client.ts`). The same shape as `zohodesk`'s `desk.zoho.<tld>`, not Books'.
 *     Confirmed live: `GET /api/v1/templates` with no auth header answers `401
 *     {"code":9031,"message":"Ticket invalid","status":"failure"}` on `sign.zoho.com`.
 *  2. **Ten data centres, not eight — and Canada breaks the pattern on BOTH hosts, not just
 *     one** (`lib/regions.ts`). Zoho Sign supports two data centres `zohobooks` does not (UK,
 *     Singapore, UAE) and lacks the one (China) that Books has. For Canada, the documented
 *     domain is `.zohocloud.ca` for the WHOLE `zoho.<tld>` segment — both the API host
 *     (`sign.zohocloud.ca`) and the accounts host (`accounts.zohocloud.ca`) diverge from the
 *     plain pattern together. Probed live: `sign.zoho.ca` and `accounts.zoho.ca` both fail to
 *     connect at all; `sign.zohocloud.ca` and `accounts.zohocloud.ca` both answer correctly.
 *  3. **Three different request encodings across the same API, not one** (`lib/client.ts`,
 *     `lib/multipart.ts`). Document/template *upload* is `multipart/form-data` with a `file`
 *     part and a plain-text `data` part; `submit`/`update`/`createdocument` are
 *     `application/x-www-form-urlencoded` with `data=<url-encoded JSON>`; `delete` on a
 *     request is flat multipart fields with no `data` envelope at all. Assuming one shape
 *     for all of them breaks at least two of the three.
 *  4. **The response envelope's success/failure signal is the vendor's own `status` field,
 *     not HTTP status** (`lib/client.ts`). A success is `{"code":0,"status":"success",
 *     "message":"...","<resource>":...}`; classification here never trusts a 200 alone. Two
 *     different auth-failure codes are told apart the same way `zohobooks` tells `14`/`57`
 *     apart: `9031` (no usable token reached the request) vs. `9041` (a token reached it and
 *     was rejected).
 *  5. **No quota surface exists** (`health/quota.ts`). Zoho Sign documents real per-minute and
 *     per-endpoint limits but exposes no `X-RateLimit-*` (or equivalent) response header —
 *     declared absent rather than guessed, same posture as `zohobooks`'s quota check.
 *
 * Deliberately absent: User Management (retrieve/invite/update/delete a user, and the
 * `ZohoSign.account.*` scope family it needs) — the endpoints are named in `introduction.html`
 * but their exact paths were never located, so rather than guess this app leaves that surface
 * out entirely, along with folder management, document-type management, field-type discovery,
 * PDF/completion-certificate download, `update-document`/`update-template` (full field
 * re-placement — a large, editor-shaped surface this app does not model field-by-field the
 * same way `request-submit`'s `fields` payload is intentionally pass-through rather than
 * structured), signer groups, and Aadhaar/e-stamping. See `README.md` for the full list and
 * why each was left out.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import requestCreate from "./actions/request-create.ts";
import requestSubmit from "./actions/request-submit.ts";
import requestList from "./actions/request-list.ts";
import requestGet from "./actions/request-get.ts";
import requestDelete from "./actions/request-delete.ts";
import requestRecall from "./actions/request-recall.ts";
import requestRemind from "./actions/request-remind.ts";

import templateList from "./actions/template-list.ts";
import templateGet from "./actions/template-get.ts";
import templateCreate from "./actions/template-create.ts";
import templateCreateDocument from "./actions/template-create-document.ts";
import templateDelete from "./actions/template-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // requests (documents)
    requestCreate,
    requestSubmit,
    requestList,
    requestGet,
    requestDelete,
    requestRecall,
    requestRemind,
    // templates
    templateList,
    templateGet,
    templateCreate,
    templateCreateDocument,
    templateDelete,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;
