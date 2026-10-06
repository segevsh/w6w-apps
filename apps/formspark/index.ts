/**
 * Formspark — a form backend: point your own HTML form at a URL and Formspark stores the
 * submissions, emails you and forwards them. This app drives its management API
 * (`api.formspark.io/public/v1`): workspaces, forms, email templates and submissions.
 *
 * Every path, verb, parameter, body field and enum was verified on 2026-10-06 against
 * Formspark's own OpenAPI 3.1 document (`/public/v1/openapi.json`, 37,463 bytes, 14 operations
 * over 10 path templates plus the template routes) and the `documentation.formspark.io` API pages.
 *
 * Findings that shaped the design:
 *
 *  1. **The API needs an upgraded workspace.** A free workspace answers `403 upgrade_required`
 *     to everything except `GET /me` and `GET /workspaces`.
 *  2. **The probe is `GET /me`** (`auth/api-token.ts`): it needs no scope and no upgrade, and
 *     returns the token's metadata, never its value. A pass proves the token is live, not that
 *     forms are reachable.
 *  3. **Errors are problem+json; branch on `code`**, never on the status or the `detail` text.
 *  4. **PATCH clears with `null`.** `form-update` omits blank fields and takes a `clearFields`
 *     list for the ones to null.
 *  5. **No ingest action.** `submit-form.com/{formId}` is a separate unauthenticated host whose
 *     JSON response shape is not documented, so it is deliberately not covered.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import meGet from "./actions/me-get.ts";
import workspaceList from "./actions/workspace-list.ts";
import workspaceCreate from "./actions/workspace-create.ts";
import workspaceUpdate from "./actions/workspace-update.ts";
import formList from "./actions/form-list.ts";
import formGet from "./actions/form-get.ts";
import formCreate from "./actions/form-create.ts";
import formUpdate from "./actions/form-update.ts";
import formDelete from "./actions/form-delete.ts";
import submissionList from "./actions/submission-list.ts";
import workspaceSubmissionList from "./actions/workspace-submission-list.ts";
import submissionDelete from "./actions/submission-delete.ts";
import templateGet from "./actions/template-get.ts";
import templateSet from "./actions/template-set.ts";
import templateDelete from "./actions/template-delete.ts";
import templatePreview from "./actions/template-preview.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    meGet,
    workspaceList,
    workspaceCreate,
    workspaceUpdate,
    formList,
    formGet,
    formCreate,
    formUpdate,
    formDelete,
    submissionList,
    workspaceSubmissionList,
    submissionDelete,
    templateGet,
    templateSet,
    templateDelete,
    templatePreview,
  ],
  auth: [apiToken],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
