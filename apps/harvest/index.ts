/**
 * Harvest — w6w port of n8n's `Harvest` node, narrowed to the time-tracking
 * core (REST API v2, `https://api.harvestapp.com/v2`).
 *
 * Every request needs two things on the wire: `Authorization: Bearer
 * <token>` and `Harvest-Account-Id: <accountId>` — both auth methods sign
 * identically, so `lib/client.ts` never touches either header itself.
 *
 * Deliberately absent from the n8n node: company, contact, estimate,
 * expense, and invoice resources. Those belong to Harvest's billing/CRM
 * surface rather than time tracking, and were left out to keep this app's
 * first cut focused on the resources the task actually asked for — time
 * entries (including timer control), projects, tasks, clients, and users.
 */
import type { AppDefinition } from "@w6w/types";
import personalAccessToken from "./auth/personal-access-token.ts";
import oauth2 from "./auth/oauth2.ts";

import timeEntryGetMany from "./actions/time-entry-get-many.ts";
import timeEntryGet from "./actions/time-entry-get.ts";
import timeEntryCreate from "./actions/time-entry-create.ts";
import timeEntryUpdate from "./actions/time-entry-update.ts";
import timeEntryDelete from "./actions/time-entry-delete.ts";
import timeEntryRestart from "./actions/time-entry-restart.ts";
import timeEntryStop from "./actions/time-entry-stop.ts";
import projectGetMany from "./actions/project-get-many.ts";
import taskGetMany from "./actions/task-get-many.ts";
import clientGetMany from "./actions/client-get-many.ts";
import userGetMany from "./actions/user-get-many.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // time entry
    timeEntryGetMany,
    timeEntryGet,
    timeEntryCreate,
    timeEntryUpdate,
    timeEntryDelete,
    timeEntryRestart,
    timeEntryStop,
    // project
    projectGetMany,
    // task
    taskGetMany,
    // client
    clientGetMany,
    // user
    userGetMany,
  ],
  auth: [personalAccessToken, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
