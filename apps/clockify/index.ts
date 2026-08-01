/**
 * Clockify — time tracking against the Clockify REST API v1
 * (`https://api.clockify.me/api/v1`).
 *
 * Every path, verb, and body field below was verified against n8n's
 * `nodes-base/nodes/Clockify/Clockify.node.ts` and `GenericFunctions.ts`, and
 * the `X-Api-Key` auth header against `ClockifyApi.credentials.ts`. "Start" /
 * "stop" / "get current" timer actions were deliberately left out — Clockify
 * has no dedicated endpoints for them (a running timer is just a time entry
 * without an `end`), and the exact `user/{userId}/time-entries` shape some
 * third-party guides describe couldn't be verified against a primary source,
 * so nothing was invented for it.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import timeEntryCreate from "./actions/time-entry-create.ts";
import timeEntryGet from "./actions/time-entry-get.ts";
import timeEntryUpdate from "./actions/time-entry-update.ts";
import timeEntryDelete from "./actions/time-entry-delete.ts";
import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";
import projectDelete from "./actions/project-delete.ts";
import workspaceList from "./actions/workspace-list.ts";
import clientList from "./actions/client-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    timeEntryCreate,
    timeEntryGet,
    timeEntryUpdate,
    timeEntryDelete,
    projectList,
    projectGet,
    projectCreate,
    projectDelete,
    workspaceList,
    clientList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
