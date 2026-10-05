/**
 * Instagram for Business — Instagram Graph API for professional (Business and
 * Creator) accounts: media, comments, mentions, tags, hashtags, insights and
 * two-step content publishing. See README.md.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import accessToken from "./auth/access-token.ts";
import createCarouselContainer from "./actions/create-carousel-container.ts";
import createComment from "./actions/create-comment.ts";
import createMediaContainer from "./actions/create-media-container.ts";
import deleteComment from "./actions/delete-comment.ts";
import getAccountInsights from "./actions/get-account-insights.ts";
import getAccount from "./actions/get-account.ts";
import getContainerStatus from "./actions/get-container-status.ts";
import getMediaInsights from "./actions/get-media-insights.ts";
import getMedia from "./actions/get-media.ts";
import getMentionedMedia from "./actions/get-mentioned-media.ts";
import getPublishingLimit from "./actions/get-publishing-limit.ts";
import hideComment from "./actions/hide-comment.ts";
import listCommentReplies from "./actions/list-comment-replies.ts";
import listComments from "./actions/list-comments.ts";
import listHashtagRecentMedia from "./actions/list-hashtag-recent-media.ts";
import listHashtagTopMedia from "./actions/list-hashtag-top-media.ts";
import listInstagramAccounts from "./actions/list-instagram-accounts.ts";
import listMediaChildren from "./actions/list-media-children.ts";
import listMedia from "./actions/list-media.ts";
import listStories from "./actions/list-stories.ts";
import listTaggedMedia from "./actions/list-tagged-media.ts";
import publishContainer from "./actions/publish-container.ts";
import replyToComment from "./actions/reply-to-comment.ts";
import replyToMention from "./actions/reply-to-mention.ts";
import searchHashtag from "./actions/search-hashtag.ts";
import setCommentsEnabled from "./actions/set-comments-enabled.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    createCarouselContainer,
    createComment,
    createMediaContainer,
    deleteComment,
    getAccountInsights,
    getAccount,
    getContainerStatus,
    getMediaInsights,
    getMedia,
    getMentionedMedia,
    getPublishingLimit,
    hideComment,
    listCommentReplies,
    listComments,
    listHashtagRecentMedia,
    listHashtagTopMedia,
    listInstagramAccounts,
    listMediaChildren,
    listMedia,
    listStories,
    listTaggedMedia,
    publishContainer,
    replyToComment,
    replyToMention,
    searchHashtag,
    setCommentsEnabled,
  ],
  auth: [oauth2, accessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
