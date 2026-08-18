/**
 * Mastodon — post, search, follow and read on any instance.
 *
 * `lib/client.ts` covers what makes this different from a centralised network:
 * every server is a different API with its own character limit, its own version
 * and its own rules, there is no central OAuth client because there is no
 * central Mastodon, and paging lives in `Link` headers rather than the body.
 */
import type { AppDefinition } from "@w6w/types";

import accessToken from "./auth/access-token.ts";

import service from "./health/service.ts";
import instance from "./health/instance.ts";
import quota from "./health/quota.ts";

import statusPost from "./actions/status-post.ts";
import statusGet from "./actions/status-get.ts";
import statusDelete from "./actions/status-delete.ts";
import statusSearch from "./actions/status-search.ts";
import statusContext from "./actions/status-context.ts";
import statusFavourite from "./actions/status-favourite.ts";
import statusUnfavourite from "./actions/status-unfavourite.ts";
import statusBoost from "./actions/status-boost.ts";
import statusUnboost from "./actions/status-unboost.ts";
import accountLookup from "./actions/account-lookup.ts";
import accountStatuses from "./actions/account-statuses.ts";
import accountFollow from "./actions/account-follow.ts";
import accountUnfollow from "./actions/account-unfollow.ts";
import timelineHome from "./actions/timeline-home.ts";
import timelinePublic from "./actions/timeline-public.ts";
import notificationList from "./actions/notification-list.ts";
import mediaUpload from "./actions/media-upload.ts";
import instanceGet from "./actions/instance-get.ts";

const app: AppDefinition = {
  actions: [
    statusPost,
    statusGet,
    statusDelete,
    statusSearch,
    statusContext,
    statusFavourite,
    statusUnfavourite,
    statusBoost,
    statusUnboost,
    accountLookup,
    accountStatuses,
    accountFollow,
    accountUnfollow,
    timelineHome,
    timelinePublic,
    notificationList,
    mediaUpload,
    instanceGet,
  ],
  auth: [accessToken],
  healthChecks: [service, instance, quota],
};

export default app;
