/**
 * Clientify — CRM and marketing automation (`api.clientify.net/v1`).
 *
 * Every path, field and filter was taken from Clientify's own published Postman collection
 * (the source behind developer.clientify.com, 279 requests, fetched 2026-10-06) and checked
 * against live unauthenticated probes of `api.clientify.net`. See `lib/client.ts` for the
 * findings that shaped the design:
 *
 *  1. A missing key is HTTP **404** `{"detail":"Api key not provided."}`, a wrong key is 401
 *     `{"detail":"Invalid token."}` — so the status code never decides credential validity.
 *  2. The credential probe is `GET /v1/users/` (users, never the token) and reads the body.
 *  3. The status page lists three API components (V1 Principal, V1 Secundaria, V2); this app
 *     calls only `/v1`, so only the two V1 components drive the `service` verdict.
 *  4. Related records (a deal's contact, a task's type) are addressed by full resource URLs,
 *     not bare ids, in request bodies.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactAddNote from "./actions/contact-add-note.ts";
import contactAddTag from "./actions/contact-add-tag.ts";
import companyList from "./actions/company-list.ts";
import companyGet from "./actions/company-get.ts";
import companyCreate from "./actions/company-create.ts";
import companyUpdate from "./actions/company-update.ts";
import companyDelete from "./actions/company-delete.ts";
import companyAddNote from "./actions/company-add-note.ts";
import dealList from "./actions/deal-list.ts";
import dealGet from "./actions/deal-get.ts";
import dealCreate from "./actions/deal-create.ts";
import dealUpdate from "./actions/deal-update.ts";
import dealDelete from "./actions/deal-delete.ts";
import dealClose from "./actions/deal-close.ts";
import dealAddNote from "./actions/deal-add-note.ts";
import pipelineList from "./actions/pipeline-list.ts";
import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";
import taskComplete from "./actions/task-complete.ts";
import taskTypeList from "./actions/task-type-list.ts";
import userList from "./actions/user-list.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    contactAddNote,
    contactAddTag,
    companyList,
    companyGet,
    companyCreate,
    companyUpdate,
    companyDelete,
    companyAddNote,
    dealList,
    dealGet,
    dealCreate,
    dealUpdate,
    dealDelete,
    dealClose,
    dealAddNote,
    pipelineList,
    taskList,
    taskGet,
    taskCreate,
    taskComplete,
    taskTypeList,
    userList,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
