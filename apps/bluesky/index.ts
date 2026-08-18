/**
 * Bluesky — post, search, follow and read on the AT Protocol.
 *
 * Two things shape this app. `lib/richtext.ts`: Bluesky does not parse your
 * text, so links and mentions need facets with UTF-8 byte offsets, and getting
 * that wrong fails silently. `auth/app-password.ts`: creating a session is
 * limited to roughly ten a day, so the app password is exchanged once and the
 * session refreshes thereafter.
 */
import type { AppDefinition } from "@w6w/types";

import appPassword from "./auth/app-password.ts";

import service from "./health/service.ts";
import pds from "./health/pds.ts";
import quota from "./health/quota.ts";

import postCreate from "./actions/post-create.ts";
import postDelete from "./actions/post-delete.ts";
import postGet from "./actions/post-get.ts";
import postSearch from "./actions/post-search.ts";
import threadGet from "./actions/thread-get.ts";
import likeCreate from "./actions/like-create.ts";
import likeDelete from "./actions/like-delete.ts";
import repostCreate from "./actions/repost-create.ts";
import repostDelete from "./actions/repost-delete.ts";
import followCreate from "./actions/follow-create.ts";
import followDelete from "./actions/follow-delete.ts";
import profileGet from "./actions/profile-get.ts";
import profileSearch from "./actions/profile-search.ts";
import feedAuthor from "./actions/feed-author.ts";
import feedTimeline from "./actions/feed-timeline.ts";
import feedGet from "./actions/feed-get.ts";
import followersList from "./actions/followers-list.ts";
import followsList from "./actions/follows-list.ts";
import notificationList from "./actions/notification-list.ts";
import notificationCount from "./actions/notification-count.ts";
import blobUpload from "./actions/blob-upload.ts";

const app: AppDefinition = {
  actions: [
    postCreate,
    postDelete,
    postGet,
    postSearch,
    threadGet,
    likeCreate,
    likeDelete,
    repostCreate,
    repostDelete,
    followCreate,
    followDelete,
    profileGet,
    profileSearch,
    feedAuthor,
    feedTimeline,
    feedGet,
    followersList,
    followsList,
    notificationList,
    notificationCount,
    blobUpload,
  ],
  auth: [appPassword],
  healthChecks: [service, pds, quota],
};

export default app;
