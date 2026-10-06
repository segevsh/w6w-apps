/**
 * Metricool: the REST API at `app.metricool.com/api` (social scheduling, analytics, competitors).
 *
 * Every path, verb, parameter and body field was read on 2026-10-06 from Metricool's own OpenAPI
 * document (`app.metricool.com/api/swagger.json`) and probed unauthenticated. Findings:
 *
 *  1. **Identity is three values on every call**: `X-Mc-Auth` (user token) and `userId` belong to
 *     the Connection (`sign` stamps both); the brand's `blogId` is an Action parameter, found with
 *     `brand-list`.
 *  2. **The gateway answers 401 for any path**, real or not, so the unsigned health probe uses the
 *     documented `GET /v2/health` and passes only on its `{"status":"UP"}` body.
 *  3. **The spec describes 559 paths and this app covers 18**: brands, scheduled posts, analytics
 *     and competitors. Deprecated operations are skipped; the rest is listed in the README.
 */
import type { AppDefinition } from "@w6w/types";
import userToken from "./auth/user-token.ts";
import analyticsAggregation from "./actions/analytics-aggregation.ts";
import analyticsDistribution from "./actions/analytics-distribution.ts";
import analyticsTimeline from "./actions/analytics-timeline.ts";
import brandGet from "./actions/brand-get.ts";
import brandList from "./actions/brand-list.ts";
import brandSummaryPostsList from "./actions/brand-summary-posts-list.ts";
import competitorAdd from "./actions/competitor-add.ts";
import competitorAggregation from "./actions/competitor-aggregation.ts";
import competitorList from "./actions/competitor-list.ts";
import competitorRemove from "./actions/competitor-remove.ts";
import competitorTimeline from "./actions/competitor-timeline.ts";
import hashtagSearch from "./actions/hashtag-search.ts";
import postCreate from "./actions/post-create.ts";
import postDelete from "./actions/post-delete.ts";
import postGet from "./actions/post-get.ts";
import postList from "./actions/post-list.ts";
import postReschedule from "./actions/post-reschedule.ts";
import postUpdate from "./actions/post-update.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    analyticsAggregation,
    analyticsDistribution,
    analyticsTimeline,
    brandGet,
    brandList,
    brandSummaryPostsList,
    competitorAdd,
    competitorAggregation,
    competitorList,
    competitorRemove,
    competitorTimeline,
    hashtagSearch,
    postCreate,
    postDelete,
    postGet,
    postList,
    postReschedule,
    postUpdate,
  ],
  auth: [userToken],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
