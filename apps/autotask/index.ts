/**
 * Datto Autotask PSA — tickets, companies, contacts, time, projects and the sales pipeline.
 *
 * `lib/client.ts` has the three facts that cost a day: the host is a numbered zone chosen per
 * connection (a closed list the manifest can enumerate), every credential failure is the same
 * empty 401, and a failed write is a 500 with an `errors` array.
 */
import type { AppDefinition } from "@w6w/types";

import apiUser from "./auth/api-user.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

import entityQuery from "./actions/entity-query.ts";
import entityCount from "./actions/entity-count.ts";
import entityGet from "./actions/entity-get.ts";
import entityFields from "./actions/entity-fields.ts";
import ticketNoteList from "./actions/ticket-note-list.ts";
import thresholdInfo from "./actions/threshold-info.ts";
import ticketCreate from "./actions/ticket-create.ts";
import ticketUpdate from "./actions/ticket-update.ts";
import ticketNoteCreate from "./actions/ticket-note-create.ts";
import companyCreate from "./actions/company-create.ts";
import companyUpdate from "./actions/company-update.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import timeEntryCreate from "./actions/time-entry-create.ts";
import timeEntryDelete from "./actions/time-entry-delete.ts";
import projectCreate from "./actions/project-create.ts";
import projectUpdate from "./actions/project-update.ts";
import projectTaskCreate from "./actions/project-task-create.ts";
import projectTaskUpdate from "./actions/project-task-update.ts";
import opportunityCreate from "./actions/opportunity-create.ts";
import opportunityUpdate from "./actions/opportunity-update.ts";

const app: AppDefinition = {
  actions: [
    entityQuery,
    entityCount,
    entityGet,
    entityFields,
    ticketNoteList,
    thresholdInfo,
    ticketCreate,
    ticketUpdate,
    ticketNoteCreate,
    companyCreate,
    companyUpdate,
    contactCreate,
    contactUpdate,
    timeEntryCreate,
    timeEntryDelete,
    projectCreate,
    projectUpdate,
    projectTaskCreate,
    projectTaskUpdate,
    opportunityCreate,
    opportunityUpdate,
  ],
  auth: [apiUser],
  healthChecks: [service, api, quota],
};

export default app;
