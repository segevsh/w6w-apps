/**
 * Paperform — forms, fields, submissions and webhooks over the Paperform API v1
 * (`api.paperform.co/v1`).
 *
 * Every path, verb, query parameter, body field and error shape in this app was verified on
 * 2026-09-29 against Paperform's own OpenAPI 3.1 document — embedded as JSON on every
 * `paperform.readme.io/reference/*` page under an `oasDefinition` key, not a single
 * downloadable spec file — plus live probes against `api.paperform.co`. The candidate
 * catalog's `developers.paperform.co` link is dead (it now serves an unrelated internal
 * job-application form); nothing here came from that page or from a third-party integration
 * directory.
 *
 * The findings that shaped the design, each documented in full where it matters:
 *
 *  1. **The docs live inside a ReadMe reference tree, not one OAS file** (see the fetch notes
 *     above). Reading it meant walking the reference's own sidebar and pulling the embedded
 *     `oasDefinition` off one page — it turned out to carry the FULL spec (`paths`,
 *     `components`), not just that page's own operation.
 *  2. **The pagination envelope puts its `total`/`has_more`/`limit`/`skip` fields as
 *     SIBLINGS of `results`, not nested inside it** (`lib/client.ts`) — read directly from
 *     the OAS response schema's `allOf` merge, not assumed from another app's shape.
 *  3. **A missing API key and a wrong one are indistinguishable** (`auth/api-key.ts`) —
 *     confirmed live, both answer the identical 401 body.
 *  4. **A 429 answers `text/html`, not JSON** (`lib/client.ts`) — confirmed live by bursting
 *     past the documented 60-requests/minute ceiling.
 *  5. **The partial-submissions endpoints key their response `"partial-submission(s)"` with a
 *     HYPHEN**, unlike the snake_case used everywhere else in this API (`space_id`,
 *     `custom_slug`, …) — read directly from the OAS, not assumed from the endpoint's own
 *     path (`actions/list-form-partial-submissions.ts` and its siblings).
 *  6. **A field's type-specific options are a discriminated union across ~24 field types**
 *     (`actions/update-form-field.ts`) — exposed as free-form JSON matching Paperform's own
 *     wire shape, the same choice this pack's `cloudconvert` app makes for its own
 *     free-form task graph, for the same reason.
 *  7. **Papersign — a separate e-signature product sharing this API's `/papersign/*`
 *     namespace — is not covered here.** See the README for why.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import listForms from "./actions/list-forms.ts";
import getForm from "./actions/get-form.ts";
import updateForm from "./actions/update-form.ts";

import listFormFields from "./actions/list-form-fields.ts";
import getFormField from "./actions/get-form-field.ts";
import updateFormField from "./actions/update-form-field.ts";

import listFormSubmissions from "./actions/list-form-submissions.ts";
import getFormSubmission from "./actions/get-form-submission.ts";
import deleteFormSubmission from "./actions/delete-form-submission.ts";
import getSubmission from "./actions/get-submission.ts";
import deleteSubmission from "./actions/delete-submission.ts";

import listFormPartialSubmissions from "./actions/list-form-partial-submissions.ts";
import getFormPartialSubmission from "./actions/get-form-partial-submission.ts";
import deleteFormPartialSubmission from "./actions/delete-form-partial-submission.ts";
import getPartialSubmission from "./actions/get-partial-submission.ts";
import deletePartialSubmission from "./actions/delete-partial-submission.ts";

import listFormWebhooks from "./actions/list-form-webhooks.ts";
import createFormWebhook from "./actions/create-form-webhook.ts";
import getFormWebhook from "./actions/get-form-webhook.ts";
import updateFormWebhook from "./actions/update-form-webhook.ts";
import deleteFormWebhook from "./actions/delete-form-webhook.ts";

import listSpaces from "./actions/list-spaces.ts";
import getSpace from "./actions/get-space.ts";
import getSpaceForms from "./actions/get-space-forms.ts";

import getFileUrls from "./actions/get-file-urls.ts";

import service from "./health/service.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    // Forms
    listForms,
    getForm,
    updateForm,
    // Form Fields
    listFormFields,
    getFormField,
    updateFormField,
    // Submissions
    listFormSubmissions,
    getFormSubmission,
    deleteFormSubmission,
    getSubmission,
    deleteSubmission,
    // Partial Submissions
    listFormPartialSubmissions,
    getFormPartialSubmission,
    deleteFormPartialSubmission,
    getPartialSubmission,
    deletePartialSubmission,
    // Webhooks
    listFormWebhooks,
    createFormWebhook,
    getFormWebhook,
    updateFormWebhook,
    deleteFormWebhook,
    // Spaces
    listSpaces,
    getSpace,
    getSpaceForms,
    // Files
    getFileUrls,
  ],
  auth: [apiKey],
  healthChecks: [service, requestRate],
} satisfies AppDefinition;
