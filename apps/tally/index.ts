/**
 * Tally — forms, submissions, analytics, workspaces and webhooks via the Tally
 * API (`api.tally.so`).
 *
 * The action list is a faithful 1:1 rendering of the vendor's OpenAPI document
 * (`https://developers.tally.so/api-reference/openapi.json`, fetched
 * 2026-08-03): **every one of the 38 operations it declares is implemented, and
 * nothing that is not in it is.** Tally's API is materially larger than the
 * other form vendors in this pack — it covers the full form lifecycle including
 * authoring, plus an analytics surface none of the siblings expose.
 *
 * Grouped by resource:
 *
 *   - **user** (1) — whoami, and the only source of `organizationId`.
 *   - **workspace** (5) + **folder** (4) — the container hierarchy, full CRUD.
 *   - **form** (5) — list, get, create, update, delete.
 *   - **question** (2) + **block** (2) — the two views of a form's contents:
 *     questions are the answerable projection, blocks the raw layout.
 *   - **submission** (3) — list, get, delete.
 *   - **analytics** (5) — metrics, visits, submissions, dimensions, drop-off.
 *   - **webhook** (4) + **webhook-event** (2) — subscriptions and their
 *     delivery log, including replay.
 *   - **organization-user** (2) + **organization-invite** (3) — team management.
 *
 * Deliberately absent, and why:
 *
 *   - **Creating a submission.** Tally publishes no write endpoint for
 *     responses — submissions arrive through the hosted form. There is nothing
 *     to call.
 *   - **An OAuth2 auth method.** The endpoints exist but are undocumented; see
 *     `auth/api-key.ts` and the README.
 *   - **A Trigger.** Tally's webhooks are managed here as Actions (matching
 *     `calendly`, the pack's only other webhook-managing app). Declaring a
 *     `TriggerDefinition` is a separate piece of work and no app in this pack
 *     ships one yet.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import userGet from "./actions/user-get.ts";

import workspaceGetMany from "./actions/workspace-get-many.ts";
import workspaceGet from "./actions/workspace-get.ts";
import workspaceCreate from "./actions/workspace-create.ts";
import workspaceUpdate from "./actions/workspace-update.ts";
import workspaceDelete from "./actions/workspace-delete.ts";

import folderGetMany from "./actions/folder-get-many.ts";
import folderCreate from "./actions/folder-create.ts";
import folderUpdate from "./actions/folder-update.ts";
import folderDelete from "./actions/folder-delete.ts";

import formGetMany from "./actions/form-get-many.ts";
import formGet from "./actions/form-get.ts";
import formCreate from "./actions/form-create.ts";
import formUpdate from "./actions/form-update.ts";
import formDelete from "./actions/form-delete.ts";

import questionGetMany from "./actions/question-get-many.ts";
import questionUpdate from "./actions/question-update.ts";
import blockGetMany from "./actions/block-get-many.ts";
import blockUpdateMany from "./actions/block-update-many.ts";

import submissionGetMany from "./actions/submission-get-many.ts";
import submissionGet from "./actions/submission-get.ts";
import submissionDelete from "./actions/submission-delete.ts";

import analyticsGetMetrics from "./actions/analytics-get-metrics.ts";
import analyticsGetVisits from "./actions/analytics-get-visits.ts";
import analyticsGetSubmissions from "./actions/analytics-get-submissions.ts";
import analyticsGetDimensions from "./actions/analytics-get-dimensions.ts";
import analyticsGetDropOff from "./actions/analytics-get-drop-off.ts";

import webhookGetMany from "./actions/webhook-get-many.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import webhookEventGetMany from "./actions/webhook-event-get-many.ts";
import webhookEventRetry from "./actions/webhook-event-retry.ts";

import organizationUserGetMany from "./actions/organization-user-get-many.ts";
import organizationUserRemove from "./actions/organization-user-remove.ts";
import organizationInviteGetMany from "./actions/organization-invite-get-many.ts";
import organizationInviteCreate from "./actions/organization-invite-create.ts";
import organizationInviteCancel from "./actions/organization-invite-cancel.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // user
    userGet,
    // workspace
    workspaceGetMany,
    workspaceGet,
    workspaceCreate,
    workspaceUpdate,
    workspaceDelete,
    // folder
    folderGetMany,
    folderCreate,
    folderUpdate,
    folderDelete,
    // form
    formGetMany,
    formGet,
    formCreate,
    formUpdate,
    formDelete,
    // question + block
    questionGetMany,
    questionUpdate,
    blockGetMany,
    blockUpdateMany,
    // submission
    submissionGetMany,
    submissionGet,
    submissionDelete,
    // analytics
    analyticsGetMetrics,
    analyticsGetVisits,
    analyticsGetSubmissions,
    analyticsGetDimensions,
    analyticsGetDropOff,
    // webhook
    webhookGetMany,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
    webhookEventGetMany,
    webhookEventRetry,
    // organization
    organizationUserGetMany,
    organizationUserRemove,
    organizationInviteGetMany,
    organizationInviteCreate,
    organizationInviteCancel,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
