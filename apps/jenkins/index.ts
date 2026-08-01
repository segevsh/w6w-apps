import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";
import triggerBuild from "./actions/trigger-build.ts";
import getBuildStatus from "./actions/get-build-status.ts";
import getJobInfo from "./actions/get-job-info.ts";
import listJobs from "./actions/list-jobs.ts";
import stopBuild from "./actions/stop-build.ts";
import getQueueItem from "./actions/get-queue-item.ts";
import service from "./health/service.ts";
import site from "./health/site.ts";

export default {
  actions: [
    triggerBuild,
    getBuildStatus,
    getJobInfo,
    listJobs,
    stopBuild,
    getQueueItem,
  ],
  auth: [basic],
  healthChecks: [service, site],
} satisfies AppDefinition;
