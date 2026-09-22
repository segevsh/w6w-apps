/**
 * Lofty — real-estate CRM.
 *
 * The shape of the API is worth knowing before reading the actions:
 *
 *  - One host (`api.lofty.com`), one prefix (`/v1.0`), one credential
 *    (`Authorization: token <key>` — lowercase `token`, not `Bearer`).
 *  - Failures are a bare JSON *string*, while success is an object.
 *  - Time is inconsistent: tasks and notes use `yyyy-MM-dd HH:mm:ss` strings,
 *    task deadlines and activities use millisecond epochs.
 *
 * `lib/client.ts` holds what those facts force on the code; `auth/api-key.ts`
 * holds the one place the credential is read.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

import leadList from "./actions/lead-list.ts";
import leadCreate from "./actions/lead-create.ts";
import leadGet from "./actions/lead-get.ts";
import leadUpdate from "./actions/lead-update.ts";
import leadDelete from "./actions/lead-delete.ts";
import taskList from "./actions/task-list.ts";
import taskCreate from "./actions/task-create.ts";
import taskGet from "./actions/task-get.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";
import noteList from "./actions/note-list.ts";
import noteCreate from "./actions/note-create.ts";
import noteGet from "./actions/note-get.ts";
import noteUpdate from "./actions/note-update.ts";
import noteDelete from "./actions/note-delete.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import memberList from "./actions/member-list.ts";
import memberGet from "./actions/member-get.ts";
import meGet from "./actions/me-get.ts";
import smsSend from "./actions/sms-send.ts";
import emailSend from "./actions/email-send.ts";
import smsHistory from "./actions/sms-history.ts";
import emailHistory from "./actions/email-history.ts";
import callHistory from "./actions/call-history.ts";
import tagList from "./actions/tag-list.ts";
import customFieldList from "./actions/custom-field-list.ts";
import pipelineList from "./actions/pipeline-list.ts";
import leadActivityList from "./actions/lead-activity-list.ts";
import appointmentList from "./actions/appointment-list.ts";
import orgGet from "./actions/org-get.ts";

const app: AppDefinition = {
  actions: [
    // lead
    leadList,
    leadCreate,
    leadGet,
    leadUpdate,
    leadDelete,
    // task
    taskList,
    taskCreate,
    taskGet,
    taskUpdate,
    taskDelete,
    // note
    noteList,
    noteCreate,
    noteGet,
    noteUpdate,
    noteDelete,
    // webhook
    webhookCreate,
    webhookList,
    webhookDelete,
    // member
    memberList,
    memberGet,
    meGet,
    // communication
    smsSend,
    emailSend,
    smsHistory,
    emailHistory,
    callHistory,
    // team features
    tagList,
    customFieldList,
    pipelineList,
    // activity / appointment / organization
    leadActivityList,
    appointmentList,
    orgGet,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
};

export default app;
