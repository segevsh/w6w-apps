/**
 * Ironclad — contract lifecycle management: launch and track workflows, read and edit the contract
 * repository (records), manage legal entities, and register webhooks, over the Ironclad Public API
 * v1 (`{host}/public/api/v1`).
 *
 * Every path, verb, query parameter, body field and scope was verified on 2026-10-06 against the
 * OpenAPI document embedded in `developer.ironcladapp.com`, plus live probes of the three
 * environments' API, OAuth and status hosts. Nothing here came from a third-party directory.
 *
 * Findings that shaped the design:
 *
 *  1. **Any bad bearer gets the same 401 on any path** under `/public/api/v1`, even nonexistent
 *     ones, so a 401 cannot show a route exists. The probe is `GET /oauth/userinfo`, which needs no
 *     scope and returns no credential, classified by the body's `code`.
 *  2. **A wrong client secret is 403 `unauthorized_client`**, not 401 / `invalid_client`
 *     (`auth/client-credentials.ts`).
 *  3. **Client-credentials tokens need `x-as-user-email`/`x-as-user-id` on every request**; `sign`
 *     stamps it.
 *  4. **Comment creation needs `public.records.createComments`**, not the workflows-prefixed scope
 *     (that belongs to the deprecated `POST /workflows/{id}/comment`).
 *  5. **Environments are separate stacks** (`ironcladapp.com`, `eu1.`, `demo.`), so each has its own
 *     OAuth method and the region is recorded on the Connection.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import oauth2Eu1 from "./auth/oauth2-eu1.ts";
import oauth2Demo from "./auth/oauth2-demo.ts";
import clientCredentials from "./auth/client-credentials.ts";

import entityCreate from "./actions/entity-create.ts";
import entityDelete from "./actions/entity-delete.ts";
import entityGet from "./actions/entity-get.ts";
import entityList from "./actions/entity-list.ts";
import recordCreate from "./actions/record-create.ts";
import recordDelete from "./actions/record-delete.ts";
import recordGet from "./actions/record-get.ts";
import recordList from "./actions/record-list.ts";
import recordSchemaGet from "./actions/record-schema-get.ts";
import recordUpdate from "./actions/record-update.ts";
import tokenInfoGet from "./actions/token-info-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import webhookList from "./actions/webhook-list.ts";
import workflowApprovalUpdate from "./actions/workflow-approval-update.ts";
import workflowApprovalsList from "./actions/workflow-approvals-list.ts";
import workflowAttributesUpdate from "./actions/workflow-attributes-update.ts";
import workflowCancel from "./actions/workflow-cancel.ts";
import workflowCommentCreate from "./actions/workflow-comment-create.ts";
import workflowCommentsList from "./actions/workflow-comments-list.ts";
import workflowCreate from "./actions/workflow-create.ts";
import workflowGet from "./actions/workflow-get.ts";
import workflowList from "./actions/workflow-list.ts";
import workflowPause from "./actions/workflow-pause.ts";
import workflowResume from "./actions/workflow-resume.ts";
import workflowSchemaGet from "./actions/workflow-schema-get.ts";
import workflowSchemasList from "./actions/workflow-schemas-list.ts";
import workflowSignersList from "./actions/workflow-signers-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    entityCreate,
    entityDelete,
    entityGet,
    entityList,
    recordCreate,
    recordDelete,
    recordGet,
    recordList,
    recordSchemaGet,
    recordUpdate,
    tokenInfoGet,
    webhookCreate,
    webhookDelete,
    webhookList,
    workflowApprovalUpdate,
    workflowApprovalsList,
    workflowAttributesUpdate,
    workflowCancel,
    workflowCommentCreate,
    workflowCommentsList,
    workflowCreate,
    workflowGet,
    workflowList,
    workflowPause,
    workflowResume,
    workflowSchemaGet,
    workflowSchemasList,
    workflowSignersList,
  ],
  auth: [oauth2, oauth2Eu1, oauth2Demo, clientCredentials],
  healthChecks: [service, quota],
} satisfies AppDefinition;
