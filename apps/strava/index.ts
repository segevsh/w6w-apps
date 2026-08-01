/**
 * Strava — read and log activities, comments, kudos and athlete stats
 * against the Strava API v3 (https://developers.strava.com/docs/reference/).
 *
 * OAuth2 is the only auth method: Strava issues short-lived (6h) access
 * tokens with rotating refresh tokens (see auth/oauth2.ts for the verified
 * detail). There is no long-lived API-key alternative.
 *
 * Deliberately out of scope for this port:
 *
 *   - **Activity uploads (file-based, `/uploads`).** Create Activity here only
 *     covers Strava's *manual* entry endpoint (`POST /activities`); uploading
 *     a GPX/TCX/FIT file is a multipart flow this pack does not model yet.
 *   - **Segments, routes, clubs, gear.** Real resources with their own
 *     endpoints, left for a follow-up rather than a partial/rushed port.
 *   - **Webhook push subscriptions.** That is a Trigger, not an Action; port
 *     it against `rfcs/trigger.md` when this pack takes on triggers.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import athleteGet from "./actions/athlete-get.ts";
import athleteStatsGet from "./actions/athlete-stats-get.ts";
import activityList from "./actions/activity-list.ts";
import activityGet from "./actions/activity-get.ts";
import activityCreate from "./actions/activity-create.ts";
import activityUpdate from "./actions/activity-update.ts";
import activityCommentsList from "./actions/activity-comments-list.ts";
import activityKudosList from "./actions/activity-kudos-list.ts";
import activityZonesGet from "./actions/activity-zones-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // athlete
    athleteGet,
    athleteStatsGet,
    // activity
    activityList,
    activityGet,
    activityCreate,
    activityUpdate,
    activityCommentsList,
    activityKudosList,
    activityZonesGet,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
