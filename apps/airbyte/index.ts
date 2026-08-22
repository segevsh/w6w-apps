/**
 * Airbyte — inspect connections, sources and destinations, trigger and watch
 * syncs, and read job history.
 *
 * Three facts shape this app. Access tokens live for **three minutes**, so the
 * stored credential is the application rather than a token. A finished job can
 * be **`incomplete`** — some streams moved and others did not — which is
 * neither success nor failure, and every job action here reports it
 * separately. And `reset` sits one word away from `sync` in the same request
 * body while deleting the destination's data, which is why it is a separate,
 * confirmed action. See `lib/client.ts`.
 */
import type { AppDefinition } from "@w6w/types";

import application from "./auth/application.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";

import connectionList from "./actions/connection-list.ts";
import connectionGet from "./actions/connection-get.ts";
import connectionPause from "./actions/connection-pause.ts";
import syncTrigger from "./actions/sync-trigger.ts";
import syncReset from "./actions/sync-reset.ts";
import jobList from "./actions/job-list.ts";
import jobGet from "./actions/job-get.ts";
import jobCancel from "./actions/job-cancel.ts";
import sourceList from "./actions/source-list.ts";
import destinationList from "./actions/destination-list.ts";
import streamPropertiesGet from "./actions/stream-properties-get.ts";
import workspaceList from "./actions/workspace-list.ts";

const app: AppDefinition = {
  actions: [
    connectionList,
    connectionGet,
    connectionPause,
    syncTrigger,
    syncReset,
    jobList,
    jobGet,
    jobCancel,
    sourceList,
    destinationList,
    streamPropertiesGet,
    workspaceList,
  ],
  auth: [application],
  healthChecks: [service, api],
};

export default app;
