/**
 * Zoho Creator — low-code app builder, over the Zoho Creator REST API v2
 * (`https://www.zohoapis.<tld>/creator/v2/...`).
 *
 * Every path, verb, header, body/query parameter and response shape in this app was
 * verified on 2026-09-29 against Zoho's own documentation — the live pages under
 * `https://www.zoho.com/creator/help/api/v2/` (`things-to-know.html`,
 * `oauth-overview.html`, `status-codes.html`, `get-applications.html`,
 * `get-forms.html`, `get-reports.html`, `get-fields.html`, `get-records.html`,
 * `add-records.html`, `update-records.html`, `delete-records.html`,
 * `upload-file.html`, `download-file.html`) — plus live probes against every
 * regional API host. Unlike this pack's `zoho-analytics` app, these pages are
 * directly reachable from normal navigation (real `<a href>` links inside
 * `oauth-overview.html`/`things-to-know.html`'s own body); no Wayback Machine
 * detour was needed.
 *
 * Scoped to **Zoho Creator's v2 REST API specifically**. Zoho Creator also has a
 * legacy Deluge-script custom-functions surface (`custom-api`, server-side
 * scripting invoked from inside a Creator app) — a fundamentally different
 * mechanism, not a REST API this sandbox can call generically, and deliberately not
 * modeled here. This pack already ships `zoho` (Zoho CRM), `zohobooks` (Zoho
 * Books), `zoho-invoice`, `zoho-analytics` and several other Zoho products with
 * separate API surfaces — do not confuse them.
 *
 * The findings that shaped the design, each documented in full where it matters:
 *
 *  1. **The API host is the shared `www.zohoapis.<tld>` gateway — not a dedicated
 *     `creator.zoho.<tld>` host**, even though `creator.zoho.com` is a real,
 *     live-redirecting URL (`lib/regions.ts`). `oauth-overview.html` publishes an
 *     explicit nine-row "API endpoints by data centre" table naming
 *     `www.zohoapis.<tld>` throughout, and every concrete `curl` sample across
 *     every endpoint page agrees; `creator.zoho.com` is the *product* URL
 *     (Creator's own web app), confirmed by a live 302 there, not the REST API.
 *  2. **Canada's API host does NOT break the naming pattern here — only its OAuth
 *     host does** (`lib/regions.ts`, `auth/oauth2.ts`). This pack's other Zoho apps
 *     (`zohobooks`, `zoho-invoice`, `zoho-analytics`) all document a Canada
 *     substitution that hits BOTH hosts (analytics) or the accounts host alone
 *     (books/invoice) — Creator's is the accounts-host-only case: verified live,
 *     `www.zohoapis.ca` resolves and answers the identical documented envelope as
 *     the other eight regions, while `accounts.zoho.ca` does not resolve at all
 *     (`accounts.zohocloud.ca` does, and answers a real OAuth redirect).
 *  3. **`account_owner_name`/`app_link_name` are required per-action params, never
 *     a connection field** (`lib/params.ts`). Unlike Zoho Books/Analytics, which
 *     have one default organization/workspace a connection can record via
 *     `afterConnect`, a single Creator OAuth token can reach many different
 *     owners' apps — every data/meta endpoint's URL path names them explicitly, so
 *     each action takes them as required params rather than assuming a default.
 *     `application-list` (Get Applications) needs neither, and is the one
 *     discovery action (and the auth `test`/`afterConnect` probe) that works
 *     immediately after connecting.
 *  4. **Auth failures collapse to one code, unlike `zoho-analytics`'s two**
 *     (`auth/oauth2.ts`). A missing `Authorization` header and a syntactically
 *     plausible but dead token both answer the identical `401 {"code":1030,
 *     "description":"Authorization Failure..."}` — verified live. `1040` (unknown
 *     account owner) and `1130` (API access permission disabled) are documented as
 *     distinct problems, but neither is a credential-liveness question, so the
 *     `test` hook reports whichever code actually came back rather than inventing
 *     a distinction the vendor's docs don't draw.
 *  5. **Get Records answers `404`/`3100` for "nothing matched" — a real, documented
 *     non-error** (`lib/client.ts`, `actions/record-list.ts`). Folded into an empty
 *     `records` array rather than surfaced as a thrown error.
 *  6. **Add/Update/Delete Records answer 200 with a PER-RECORD result envelope**
 *     even when some records inside it failed (`lib/client.ts`,
 *     `actions/record-add.ts` and siblings) — passed through as-is; a caller
 *     inspects each item's own `code`.
 *  7. **No quota surface exists** (`health/quota.ts`). Zoho Creator documents a
 *     real per-subscription daily call budget and a 50-calls/min-per-endpoint cap,
 *     but exposes no `X-RateLimit-*` (or equivalent) response header to probe
 *     headroom ahead of the eventual error — declared absent rather than guessed.
 *
 * Deliberately absent: the legacy Deluge custom-functions surface (a different
 * mechanism, not REST); the Publish API (`publish-api/*.html` — a `privatelink`-
 * based anonymous public-form-submission mechanism with no OAuth token at all,
 * a different auth model from every other action in this app); the Bulk Read API
 * (`bulk-api/*.html` — an asynchronous create-job/poll-status/download-zip flow for
 * exporting large datasets, needed for tables beyond what Get Records' 200-per-call
 * limit comfortably covers — large enough to be its own action pair, and this
 * app's `record-list` already covers the common paginated-read case via
 * `from`/`limit`); and the "fields"/"tasks" response-shaping niceties on Add/Update
 * Records beyond the boolean `message`/`tasks` switches this app exposes.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import applicationList from "./actions/application-list.ts";
import formList from "./actions/form-list.ts";
import reportList from "./actions/report-list.ts";
import fieldList from "./actions/field-list.ts";

import recordList from "./actions/record-list.ts";
import recordAdd from "./actions/record-add.ts";
import recordUpdate from "./actions/record-update.ts";
import recordDelete from "./actions/record-delete.ts";

import fileUpload from "./actions/file-upload.ts";
import fileDownload from "./actions/file-download.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // discovery
    applicationList,
    formList,
    reportList,
    fieldList,
    // records
    recordList,
    recordAdd,
    recordUpdate,
    recordDelete,
    // files
    fileUpload,
    fileDownload,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;
