/**
 * DocuSeal — build templates, send them out as submissions for signature,
 * track submitters, and read back the signed documents.
 *
 * Every path, parameter, required body field and response shape was taken
 * from DocuSeal's own OpenAPI 3.1 document
 * (`https://console.docuseal.com/openapi.yml`, ~193KB, fetched 2026-09-29),
 * and the auth and error behaviour was measured against both live hosts.
 *
 * ## Two fixed hosts
 *
 * A DocuSeal account lives on exactly one of `api.docuseal.com` (global) or
 * `api.docuseal.eu` (EU) — both declared in the spec's `servers` block, both
 * live. See `lib/client.ts` for why that is a `region` field on the one Auth
 * method rather than a separate `AuthDefinition` per region.
 *
 * ## Templates vs. submissions
 *
 * A **template** defines what gets signed — its documents, the fields placed
 * on them, and the submitter roles. A **submission** is a live signature
 * request built from a template (or, via the `*-from-pdf`/`*-from-docx`/
 * `*-from-html` actions, from documents given directly with no template
 * saved first) and sent to one or more **submitters**. Nothing is sent to a
 * signer until a submission exists — creating a template is silent.
 *
 * ## Two ways in, not one
 *
 * `submission-create` needs an existing `templateId`. The `*-from-pdf`,
 * `*-from-docx` and `*-from-html` submission actions build the one-off
 * documents and the submission in a single call, without ever saving a
 * reusable template — the equivalent template-only actions exist too, for
 * building a reusable template without sending anything yet.
 *
 * ## What's deliberately out of scope
 *
 *   - **No action attaches a local file.** Every `file` field this app sends
 *     is base64-encoded content or a downloadable URL, exactly as the API
 *     accepts — the sandbox has no local filesystem to read a PDF/DOCX from,
 *     so producing that base64/URL is left to whatever step feeds this one.
 *   - **The self-hosted deployment path.** DocuSeal is open-source and
 *     self-hostable, but `w6w.network.allow` can only name the two hosted API
 *     hosts the spec declares — a self-hosted instance's address is unknown
 *     at manifest time, unlike this pack's `documenso`, which can fall back
 *     to a `*` allowlist because Documenso's spec ships no bounded host set
 *     to prefer instead.
 *   - **Nested field/area schemas are passed through as JSON**, not
 *     flattened into dozens of individual params — DocuSeal's own
 *     `submitters`/`documents`/`fields` request shapes run many levels deep
 *     (an area's `x`/`y`/`w`/`h`/`page`, a field's `validation`, a
 *     submitter's per-field overrides), and forcing each into its own Param
 *     would make the common case worse to build a payload that already has a
 *     well-documented JSON shape.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import templateList from "./actions/template-list.ts";
import templateGet from "./actions/template-get.ts";
import templateArchive from "./actions/template-archive.ts";
import templateUpdate from "./actions/template-update.ts";
import templateDocumentsUpdate from "./actions/template-documents-update.ts";
import templateClone from "./actions/template-clone.ts";
import templateCreateFromHtml from "./actions/template-create-from-html.ts";
import templateCreateFromDocx from "./actions/template-create-from-docx.ts";
import templateCreateFromPdf from "./actions/template-create-from-pdf.ts";
import templateMerge from "./actions/template-merge.ts";

import submissionList from "./actions/submission-list.ts";
import submissionCreate from "./actions/submission-create.ts";
import submissionGet from "./actions/submission-get.ts";
import submissionArchive from "./actions/submission-archive.ts";
import submissionUpdate from "./actions/submission-update.ts";
import submissionDocumentsGet from "./actions/submission-documents-get.ts";
import submissionCreateFromEmails from "./actions/submission-create-from-emails.ts";
import submissionCreateFromPdf from "./actions/submission-create-from-pdf.ts";
import submissionCreateFromDocx from "./actions/submission-create-from-docx.ts";
import submissionCreateFromHtml from "./actions/submission-create-from-html.ts";

import submitterGet from "./actions/submitter-get.ts";
import submitterUpdate from "./actions/submitter-update.ts";
import submitterList from "./actions/submitter-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // templates — what gets signed
    templateList,
    templateGet,
    templateArchive,
    templateUpdate,
    templateDocumentsUpdate,
    templateClone,
    templateCreateFromHtml,
    templateCreateFromDocx,
    templateCreateFromPdf,
    templateMerge,
    // submissions — a live signature request
    submissionList,
    submissionCreate,
    submissionGet,
    submissionArchive,
    submissionUpdate,
    submissionDocumentsGet,
    submissionCreateFromEmails,
    submissionCreateFromPdf,
    submissionCreateFromDocx,
    submissionCreateFromHtml,
    // submitters — one signer's own state
    submitterGet,
    submitterUpdate,
    submitterList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
