/**
 * Twist — Doist's async team messaging: workspaces, channels, threads, comments, direct
 * conversations and messages, groups, reactions, the inbox, search, notification settings and
 * event webhooks, over the Twist API (`api.twist.com`).
 *
 * Every path, verb, parameter and enum here was read on 2026-10-06 from the v3 reference
 * (`developer.twist.com/v3/`, 380 KB) and cross-checked with live probes of `api.twist.com`
 * and `status.twist.io`. Nothing came from a third-party integration directory.
 *
 * The findings that shaped the design (details where each matters):
 *
 *  1. **The current-user object carries the live API token** (`auth/probe.ts`,
 *     `actions/user-get-current.ts`). `GET /users/get_session_user` returns `token`, "The user's
 *     API token", and so does `POST /users/update`. The health probe is `GET /workspaces/get`
 *     instead; both actions delete the field before returning.
 *  2. **A missing token and a bad token are the same answer** — `403`, `error_code` 200
 *     "Invalid token" — so the credential verdict is read from `error_code`, never the status.
 *  3. **Two API versions.** Only `workspace_users/*` lives on `/api/v4`; the v3 copies are
 *     deprecated ("will be removed in the upcoming /v4/ release") and are not offered.
 *  4. **Form-encoded writes.** The reference's examples are all `-d key=value`, so writes are
 *     sent as `application/x-www-form-urlencoded` with lists JSON-encoded (`[10,11]`).
 *  5. **Closing a thread is a comment.** There is no close endpoint: `thread-close` and
 *     `thread-reopen` post a comment with `thread_action`.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import oauth2 from "./auth/oauth2.ts";

import userGetCurrent from "./actions/user-get-current.ts";
import userUpdate from "./actions/user-update.ts";
import userPresenceSet from "./actions/user-presence-set.ts";
import userPresenceReset from "./actions/user-presence-reset.ts";
import workspaceGet from "./actions/workspace-get.ts";
import workspaceGetDefault from "./actions/workspace-get-default.ts";
import workspaceList from "./actions/workspace-list.ts";
import workspaceCreate from "./actions/workspace-create.ts";
import workspaceUpdate from "./actions/workspace-update.ts";
import workspacePublicChannelsList from "./actions/workspace-public-channels-list.ts";
import workspaceUserList from "./actions/workspace-user-list.ts";
import workspaceUserIdsList from "./actions/workspace-user-ids-list.ts";
import workspaceUserGet from "./actions/workspace-user-get.ts";
import workspaceUserGetByEmail from "./actions/workspace-user-get-by-email.ts";
import workspaceUserInfoGet from "./actions/workspace-user-info-get.ts";
import workspaceUserLocalTimeGet from "./actions/workspace-user-local-time-get.ts";
import workspaceUserAdd from "./actions/workspace-user-add.ts";
import workspaceUserInviteResend from "./actions/workspace-user-invite-resend.ts";
import workspaceUserUpdate from "./actions/workspace-user-update.ts";
import workspaceUserRemove from "./actions/workspace-user-remove.ts";
import groupGet from "./actions/group-get.ts";
import groupList from "./actions/group-list.ts";
import groupCreate from "./actions/group-create.ts";
import groupUpdate from "./actions/group-update.ts";
import groupRemove from "./actions/group-remove.ts";
import groupUserAdd from "./actions/group-user-add.ts";
import groupUsersAdd from "./actions/group-users-add.ts";
import groupUserRemove from "./actions/group-user-remove.ts";
import groupUsersRemove from "./actions/group-users-remove.ts";
import channelGet from "./actions/channel-get.ts";
import channelList from "./actions/channel-list.ts";
import channelCreate from "./actions/channel-create.ts";
import channelUpdate from "./actions/channel-update.ts";
import channelArchive from "./actions/channel-archive.ts";
import channelUnarchive from "./actions/channel-unarchive.ts";
import channelFavorite from "./actions/channel-favorite.ts";
import channelUnfavorite from "./actions/channel-unfavorite.ts";
import channelRemove from "./actions/channel-remove.ts";
import channelUserAdd from "./actions/channel-user-add.ts";
import channelUsersAdd from "./actions/channel-users-add.ts";
import channelUserRemove from "./actions/channel-user-remove.ts";
import channelUsersRemove from "./actions/channel-users-remove.ts";
import threadGet from "./actions/thread-get.ts";
import threadList from "./actions/thread-list.ts";
import threadCreate from "./actions/thread-create.ts";
import threadUpdate from "./actions/thread-update.ts";
import threadRemove from "./actions/thread-remove.ts";
import threadStar from "./actions/thread-star.ts";
import threadUnstar from "./actions/thread-unstar.ts";
import threadPin from "./actions/thread-pin.ts";
import threadUnpin from "./actions/thread-unpin.ts";
import threadMove from "./actions/thread-move.ts";
import threadUnreadList from "./actions/thread-unread-list.ts";
import threadMarkRead from "./actions/thread-mark-read.ts";
import threadMarkUnread from "./actions/thread-mark-unread.ts";
import threadMarkUnreadForOthers from "./actions/thread-mark-unread-for-others.ts";
import threadsMarkAllRead from "./actions/threads-mark-all-read.ts";
import threadsClearUnread from "./actions/threads-clear-unread.ts";
import threadMute from "./actions/thread-mute.ts";
import threadUnmute from "./actions/thread-unmute.ts";
import threadClose from "./actions/thread-close.ts";
import threadReopen from "./actions/thread-reopen.ts";
import commentGet from "./actions/comment-get.ts";
import commentList from "./actions/comment-list.ts";
import commentCreate from "./actions/comment-create.ts";
import commentUpdate from "./actions/comment-update.ts";
import commentRemove from "./actions/comment-remove.ts";
import commentMarkPosition from "./actions/comment-mark-position.ts";
import conversationGet from "./actions/conversation-get.ts";
import conversationGetOrCreate from "./actions/conversation-get-or-create.ts";
import conversationList from "./actions/conversation-list.ts";
import conversationUpdate from "./actions/conversation-update.ts";
import conversationUserAdd from "./actions/conversation-user-add.ts";
import conversationUsersAdd from "./actions/conversation-users-add.ts";
import conversationArchive from "./actions/conversation-archive.ts";
import conversationUnarchive from "./actions/conversation-unarchive.ts";
import conversationUnreadList from "./actions/conversation-unread-list.ts";
import conversationMarkRead from "./actions/conversation-mark-read.ts";
import conversationMarkUnread from "./actions/conversation-mark-unread.ts";
import conversationMute from "./actions/conversation-mute.ts";
import conversationUnmute from "./actions/conversation-unmute.ts";
import messageGet from "./actions/message-get.ts";
import messageList from "./actions/message-list.ts";
import messageCreate from "./actions/message-create.ts";
import messageUpdate from "./actions/message-update.ts";
import messageRemove from "./actions/message-remove.ts";
import attachmentRemove from "./actions/attachment-remove.ts";
import reactionGet from "./actions/reaction-get.ts";
import reactionAdd from "./actions/reaction-add.ts";
import reactionRemove from "./actions/reaction-remove.ts";
import inboxList from "./actions/inbox-list.ts";
import inboxArchiveAll from "./actions/inbox-archive-all.ts";
import inboxArchiveThread from "./actions/inbox-archive-thread.ts";
import inboxUnarchiveThread from "./actions/inbox-unarchive-thread.ts";
import inboxMarkAllRead from "./actions/inbox-mark-all-read.ts";
import inboxCountGet from "./actions/inbox-count-get.ts";
import search from "./actions/search.ts";
import searchThread from "./actions/search-thread.ts";
import searchConversation from "./actions/search-conversation.ts";
import threadAutocomplete from "./actions/thread-autocomplete.ts";
import notificationSettingsGet from "./actions/notification-settings-get.ts";
import notificationSettingUpdate from "./actions/notification-setting-update.ts";
import notificationSettingsUpdateMany from "./actions/notification-settings-update-many.ts";
import urlJoinGet from "./actions/url-join-get.ts";
import urlJoinGetOrCreate from "./actions/url-join-get-or-create.ts";
import urlJoinDisable from "./actions/url-join-disable.ts";
import workspaceJoinByUrl from "./actions/workspace-join-by-url.ts";
import loopInGetOrCreate from "./actions/loop-in-get-or-create.ts";
import loopInDisable from "./actions/loop-in-disable.ts";
import webhookSubscribe from "./actions/webhook-subscribe.ts";
import webhookUnsubscribe from "./actions/webhook-unsubscribe.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // user
    userGetCurrent,
    userUpdate,
    userPresenceSet,
    userPresenceReset,
    // workspace
    workspaceGet,
    workspaceGetDefault,
    workspaceList,
    workspaceCreate,
    workspaceUpdate,
    workspacePublicChannelsList,
    urlJoinGet,
    urlJoinGetOrCreate,
    urlJoinDisable,
    workspaceJoinByUrl,
    // workspace-user
    workspaceUserList,
    workspaceUserIdsList,
    workspaceUserGet,
    workspaceUserGetByEmail,
    workspaceUserInfoGet,
    workspaceUserLocalTimeGet,
    workspaceUserAdd,
    workspaceUserInviteResend,
    workspaceUserUpdate,
    workspaceUserRemove,
    // group
    groupGet,
    groupList,
    groupCreate,
    groupUpdate,
    groupRemove,
    groupUserAdd,
    groupUsersAdd,
    groupUserRemove,
    groupUsersRemove,
    // channel
    channelGet,
    channelList,
    channelCreate,
    channelUpdate,
    channelArchive,
    channelUnarchive,
    channelFavorite,
    channelUnfavorite,
    channelRemove,
    channelUserAdd,
    channelUsersAdd,
    channelUserRemove,
    channelUsersRemove,
    // thread
    threadGet,
    threadList,
    threadCreate,
    threadUpdate,
    threadRemove,
    threadStar,
    threadUnstar,
    threadPin,
    threadUnpin,
    threadMove,
    threadUnreadList,
    threadMarkRead,
    threadMarkUnread,
    threadMarkUnreadForOthers,
    threadsMarkAllRead,
    threadsClearUnread,
    threadMute,
    threadUnmute,
    threadClose,
    threadReopen,
    // comment
    commentGet,
    commentList,
    commentCreate,
    commentUpdate,
    commentRemove,
    commentMarkPosition,
    // conversation
    conversationGet,
    conversationGetOrCreate,
    conversationList,
    conversationUpdate,
    conversationUserAdd,
    conversationUsersAdd,
    conversationArchive,
    conversationUnarchive,
    conversationUnreadList,
    conversationMarkRead,
    conversationMarkUnread,
    conversationMute,
    conversationUnmute,
    // message
    messageGet,
    messageList,
    messageCreate,
    messageUpdate,
    messageRemove,
    // attachment
    attachmentRemove,
    // reaction
    reactionGet,
    reactionAdd,
    reactionRemove,
    // inbox
    inboxList,
    inboxArchiveAll,
    inboxArchiveThread,
    inboxUnarchiveThread,
    inboxMarkAllRead,
    inboxCountGet,
    // search
    search,
    searchThread,
    searchConversation,
    threadAutocomplete,
    // notification
    notificationSettingsGet,
    notificationSettingUpdate,
    notificationSettingsUpdateMany,
    // loop-in
    loopInGetOrCreate,
    loopInDisable,
    // webhook
    webhookSubscribe,
    webhookUnsubscribe,
  ],
  // OAuth 2.0 for a shared integration; the personal test token for development and
  // single-user workflows.
  auth: [oauth2, apiToken],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
