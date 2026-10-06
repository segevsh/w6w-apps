/**
 * Productive.io: project and agency management. Projects, tasks, task lists, boards, to-dos,
 * comments, people, companies, deals and budgets, time entries, services, bookings, invoices
 * (read), workflow statuses, Docs pages and webhooks, over the Productive REST API
 * (`api.productive.io/api/v2`).
 *
 * Every path, verb, filter, attribute and enum was verified on 2026-10-06 against the vendor's own
 * OpenAPI document (`api-master.yaml`) plus unauthenticated probes of the live host. No token was
 * available, so no write has been run against a real organization (see the README).
 *
 * Findings that shaped the design (details where they matter, and in the README):
 *
 *  1. **JSON:API with a mandatory content type** (`lib/client.ts`): `Content-Type` is checked
 *     before authentication, so a POST sent as `application/json` is a `415` even with no token.
 *  2. **A wrong token and a missing token answer the same `401 invalid_auth_token`**
 *     (`auth/api-token.ts`), and `GET /organizations` returns live secrets, so the probe is a
 *     one-row project list and the verdict comes from the body.
 *  3. **There is no status feed**, but the status page's own Uptime.com JSON names an
 *     "API Requests" component (`health/service.ts`). The API has no quota headers
 *     (`health/quota.ts` declares that).
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";
import projectUpdate from "./actions/project-update.ts";
import projectArchive from "./actions/project-archive.ts";
import projectRestore from "./actions/project-restore.ts";
import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";
import tasklistList from "./actions/tasklist-list.ts";
import tasklistGet from "./actions/tasklist-get.ts";
import tasklistCreate from "./actions/tasklist-create.ts";
import tasklistUpdate from "./actions/tasklist-update.ts";
import boardList from "./actions/board-list.ts";
import boardGet from "./actions/board-get.ts";
import boardCreate from "./actions/board-create.ts";
import todoList from "./actions/todo-list.ts";
import todoCreate from "./actions/todo-create.ts";
import todoUpdate from "./actions/todo-update.ts";
import commentList from "./actions/comment-list.ts";
import commentCreate from "./actions/comment-create.ts";
import commentUpdate from "./actions/comment-update.ts";
import commentDelete from "./actions/comment-delete.ts";
import personList from "./actions/person-list.ts";
import personGet from "./actions/person-get.ts";
import companyList from "./actions/company-list.ts";
import companyGet from "./actions/company-get.ts";
import companyCreate from "./actions/company-create.ts";
import companyUpdate from "./actions/company-update.ts";
import dealList from "./actions/deal-list.ts";
import dealGet from "./actions/deal-get.ts";
import dealCreate from "./actions/deal-create.ts";
import dealUpdate from "./actions/deal-update.ts";
import dealStatusList from "./actions/deal-status-list.ts";
import timeEntryList from "./actions/time-entry-list.ts";
import timeEntryGet from "./actions/time-entry-get.ts";
import timeEntryCreate from "./actions/time-entry-create.ts";
import timeEntryUpdate from "./actions/time-entry-update.ts";
import timeEntryDelete from "./actions/time-entry-delete.ts";
import serviceList from "./actions/service-list.ts";
import serviceGet from "./actions/service-get.ts";
import bookingList from "./actions/booking-list.ts";
import bookingGet from "./actions/booking-get.ts";
import bookingCreate from "./actions/booking-create.ts";
import bookingUpdate from "./actions/booking-update.ts";
import bookingDelete from "./actions/booking-delete.ts";
import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import workflowStatusList from "./actions/workflow-status-list.ts";
import pageList from "./actions/page-list.ts";
import pageGet from "./actions/page-get.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import webhookCreate from "./actions/webhook-create.ts";

const app: AppDefinition = {
  actions: [
    projectList,
    projectGet,
    projectCreate,
    projectUpdate,
    projectArchive,
    projectRestore,
    taskList,
    taskGet,
    taskCreate,
    taskUpdate,
    taskDelete,
    tasklistList,
    tasklistGet,
    tasklistCreate,
    tasklistUpdate,
    boardList,
    boardGet,
    boardCreate,
    todoList,
    todoCreate,
    todoUpdate,
    commentList,
    commentCreate,
    commentUpdate,
    commentDelete,
    personList,
    personGet,
    companyList,
    companyGet,
    companyCreate,
    companyUpdate,
    dealList,
    dealGet,
    dealCreate,
    dealUpdate,
    dealStatusList,
    timeEntryList,
    timeEntryGet,
    timeEntryCreate,
    timeEntryUpdate,
    timeEntryDelete,
    serviceList,
    serviceGet,
    bookingList,
    bookingGet,
    bookingCreate,
    bookingUpdate,
    bookingDelete,
    invoiceList,
    invoiceGet,
    workflowStatusList,
    pageList,
    pageGet,
    webhookList,
    webhookGet,
    webhookDelete,
    webhookCreate,
  ],
  auth: [apiToken],
  healthChecks: [service, api, quota],
};

export default app;
