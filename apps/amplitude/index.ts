/**
 * Amplitude — send events, and query the analytics built from them.
 *
 * `lib/client.ts` has the shape of it: two products, two credentials, four
 * hosts, three error formats. The two behaviours worth knowing before writing
 * anything are that ids under five characters are silently removed rather than
 * rejected, and that a retry double-counts unless `insert_id` is stable.
 */
import type { AppDefinition } from "@w6w/types";

import apiKeys from "./auth/api-keys.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

import eventTrack from "./actions/event-track.ts";
import eventBatch from "./actions/event-batch.ts";
import userIdentify from "./actions/user-identify.ts";
import groupIdentify from "./actions/group-identify.ts";
import eventList from "./actions/event-list.ts";
import eventSegmentation from "./actions/event-segmentation.ts";
import funnelQuery from "./actions/funnel-query.ts";
import retentionQuery from "./actions/retention-query.ts";
import userSearch from "./actions/user-search.ts";
import userActivity from "./actions/user-activity.ts";
import cohortList from "./actions/cohort-list.ts";
import annotationList from "./actions/annotation-list.ts";
import annotationCreate from "./actions/annotation-create.ts";
import chartQuery from "./actions/chart-query.ts";
import userDelete from "./actions/user-delete.ts";

const app: AppDefinition = {
  actions: [
    eventTrack,
    eventBatch,
    userIdentify,
    groupIdentify,
    eventList,
    eventSegmentation,
    funnelQuery,
    retentionQuery,
    userSearch,
    userActivity,
    cohortList,
    annotationList,
    annotationCreate,
    chartQuery,
    userDelete,
  ],
  auth: [apiKeys],
  healthChecks: [service, quota],
};

export default app;
