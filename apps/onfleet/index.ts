/**
 * Onfleet — dispatch and track last-mile deliveries.
 *
 * See `lib/client.ts` for the shape everything rests on: Basic auth with a
 * blank password, bare (unwrapped) request bodies, and the container model
 * that decides who a task belongs to.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

import taskCreate from "./actions/task-create.ts";
import taskGet from "./actions/task-get.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";
import taskComplete from "./actions/task-complete.ts";
import taskList from "./actions/task-list.ts";

import workerCreate from "./actions/worker-create.ts";
import workerGet from "./actions/worker-get.ts";
import workerUpdate from "./actions/worker-update.ts";
import workerDelete from "./actions/worker-delete.ts";
import workerList from "./actions/worker-list.ts";
import workerListByLocation from "./actions/worker-list-by-location.ts";

import teamCreate from "./actions/team-create.ts";
import teamGet from "./actions/team-get.ts";
import teamUpdate from "./actions/team-update.ts";
import teamDelete from "./actions/team-delete.ts";
import teamList from "./actions/team-list.ts";

import organizationGet from "./actions/organization-get.ts";
import organizationGetDelegatee from "./actions/organization-get-delegatee.ts";

import destinationCreate from "./actions/destination-create.ts";
import destinationGet from "./actions/destination-get.ts";

import hubCreate from "./actions/hub-create.ts";
import hubUpdate from "./actions/hub-update.ts";
import hubList from "./actions/hub-list.ts";

import webhookCreate from "./actions/webhook-create.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import recipientCreate from "./actions/recipient-create.ts";
import recipientGet from "./actions/recipient-get.ts";
import recipientUpdate from "./actions/recipient-update.ts";
import recipientFind from "./actions/recipient-find.ts";
import taskCreated from "./triggers/task-created.ts";
import taskStarted from "./triggers/task-started.ts";
import taskCompleted from "./triggers/task-completed.ts";
import taskFailed from "./triggers/task-failed.ts";
import taskAssigned from "./triggers/task-assigned.ts";
import taskUpdated from "./triggers/task-updated.ts";
import taskDeleted from "./triggers/task-deleted.ts";
import taskUnassigned from "./triggers/task-unassigned.ts";
import taskCloned from "./triggers/task-cloned.ts";
import taskEta from "./triggers/task-eta.ts";
import taskArrival from "./triggers/task-arrival.ts";
import taskDelayed from "./triggers/task-delayed.ts";
import workerDuty from "./triggers/worker-duty.ts";
import workerCreated from "./triggers/worker-created.ts";
import workerDeleted from "./triggers/worker-deleted.ts";
import workerUpdated from "./triggers/worker-updated.ts";
import smsRecipientResponseMissed from "./triggers/sms-recipient-response-missed.ts";
import smsRecipientOptOut from "./triggers/sms-recipient-opt-out.ts";
import anyEvent from "./triggers/any-event.ts";
import newTeam from "./triggers/new-team.ts";
import newHub from "./triggers/new-hub.ts";

const app: AppDefinition = {
  actions: [
    taskCreate,
    taskGet,
    taskUpdate,
    taskDelete,
    taskComplete,
    taskList,
    workerCreate,
    workerGet,
    workerUpdate,
    workerDelete,
    workerList,
    workerListByLocation,
    teamCreate,
    teamGet,
    teamUpdate,
    teamDelete,
    teamList,
    organizationGet,
    organizationGetDelegatee,
    destinationCreate,
    destinationGet,
    hubCreate,
    hubUpdate,
    hubList,
    webhookCreate,
    webhookList,
    webhookUpdate,
    webhookDelete,
    recipientCreate,
    recipientGet,
    recipientUpdate,
    recipientFind,
  ],
  triggers: [
    taskCreated,
    taskStarted,
    taskCompleted,
    taskFailed,
    taskAssigned,
    taskUpdated,
    taskDeleted,
    taskUnassigned,
    taskCloned,
    taskEta,
    taskArrival,
    taskDelayed,
    workerDuty,
    workerCreated,
    workerDeleted,
    workerUpdated,
    smsRecipientResponseMissed,
    smsRecipientOptOut,
    anyEvent,
    newTeam,
    newHub,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
};

export default app;
