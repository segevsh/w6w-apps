/**
 * Jotform — forms, questions and submissions via the Jotform REST API
 * (`api.jotform.com`, with EU and HIPAA regional hosts).
 *
 * Covers the read surface of an account's forms (list, detail, questions,
 * properties), the full read/write surface of submissions (list per form and
 * account-wide, get, create, edit, delete), plus reports and the folder tree.
 *
 * Deliberately absent:
 *
 *   - **Webhooks** (`/form/{id}/webhooks`) — that is a Trigger, not an Action.
 *   - **Form authoring** — creating, cloning and deleting forms, and adding or
 *     editing questions and properties. Jotform's authoring payloads are
 *     deeply nested form-encoded structures (`questions[0][type]`,
 *     `emails[0][subject]`, …) that are far better built in Jotform's own form
 *     designer; this app is for *running* forms, not designing them.
 *   - **Account provisioning** (`/user/register`, `/user/login`,
 *     `/user/logout`, `/user/settings` writes, `/user/subusers`) — operator
 *     concerns, and `login` trades a password for a session, which is the wrong
 *     shape for a workflow step.
 *   - **Enterprise custom domains** — supporting them would mean a `"*"` egress
 *     allowlist. The three published regional hosts are enumerated instead.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import userGet from "./actions/user-get.ts";
import userGetUsage from "./actions/user-get-usage.ts";
import formGetMany from "./actions/form-get-many.ts";
import formGet from "./actions/form-get.ts";
import formGetQuestions from "./actions/form-get-questions.ts";
import formGetProperties from "./actions/form-get-properties.ts";
import submissionGetMany from "./actions/submission-get-many.ts";
import submissionGetManyAllForms from "./actions/submission-get-many-all-forms.ts";
import submissionGet from "./actions/submission-get.ts";
import submissionCreate from "./actions/submission-create.ts";
import submissionEdit from "./actions/submission-edit.ts";
import submissionDelete from "./actions/submission-delete.ts";
import reportGetMany from "./actions/report-get-many.ts";
import folderGetMany from "./actions/folder-get-many.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // user
    userGet,
    userGetUsage,
    // form
    formGetMany,
    formGet,
    formGetQuestions,
    formGetProperties,
    // submission
    submissionGetMany,
    submissionGetManyAllForms,
    submissionGet,
    submissionCreate,
    submissionEdit,
    submissionDelete,
    // report
    reportGetMany,
    // folder
    folderGetMany,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
