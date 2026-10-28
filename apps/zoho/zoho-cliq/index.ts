/**
 * Zoho Cliq — team chat, over the Cliq REST API v2
 * (`https://cliq.zoho.com/api/v2/...` and its eight regional siblings).
 *
 * Every path, verb, body field and scope in this app was verified on
 * 2026-10-06 against Zoho's own reference
 * (`https://www.zoho.com/cliq/help/restapi/v2/`) and live probes of all nine
 * regional API and accounts hosts. Scoped to **Zoho Cliq specifically** — this
 * pack's other Zoho apps are separate products with separate API surfaces.
 *
 * The findings that shaped the design (details in `lib/client.ts`,
 * `lib/regions.ts`, `auth/oauth2.ts` and the README):
 *
 *  1. The API host is `cliq.zoho.<tld>` directly, nine data centres, and
 *     Canada is `cliq.zohocloud.ca` / `accounts.zohocloud.ca`.
 *  2. Every "post message" and "share file" endpoint is gated by the
 *     `ZohoCliq.Webhooks.CREATE` scope — not a Messages scope.
 *  3. Most mutations answer `204 No Content` with an empty body.
 *  4. A call with no token is answered by a blank two-byte `text/html` 401; only
 *     a dead token gets the JSON `{"code":"oauthtoken_invalid"}`.
 *  5. No quota surface: per-endpoint limits are documented, none exposed as
 *     a response header.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userTeamList from "./actions/user-team-list.ts";

import chatList from "./actions/chat-list.ts";
import chatMemberList from "./actions/chat-member-list.ts";

import channelCreate from "./actions/channel-create.ts";
import channelDelete from "./actions/channel-delete.ts";
import channelGet from "./actions/channel-get.ts";
import channelJoin from "./actions/channel-join.ts";
import channelLeave from "./actions/channel-leave.ts";
import channelList from "./actions/channel-list.ts";
import channelMemberAdd from "./actions/channel-member-add.ts";
import channelMemberList from "./actions/channel-member-list.ts";
import channelMemberRemove from "./actions/channel-member-remove.ts";
import channelUpdate from "./actions/channel-update.ts";

import teamList from "./actions/team-list.ts";
import teamGet from "./actions/team-get.ts";

import messageList from "./actions/message-list.ts";
import messageGet from "./actions/message-get.ts";
import messagePostChannel from "./actions/message-post-channel.ts";
import messagePostChat from "./actions/message-post-chat.ts";
import messagePostUser from "./actions/message-post-user.ts";
import messagePostBot from "./actions/message-post-bot.ts";
import messageEdit from "./actions/message-edit.ts";
import messageDelete from "./actions/message-delete.ts";

import fileShareChannel from "./actions/file-share-channel.ts";
import fileShareChat from "./actions/file-share-chat.ts";
import fileShareUser from "./actions/file-share-user.ts";

import reminderCreate from "./actions/reminder-create.ts";
import reminderList from "./actions/reminder-list.ts";
import reminderDelete from "./actions/reminder-delete.ts";
import reminderComplete from "./actions/reminder-complete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // users
    userList,
    userGet,
    userTeamList,
    // chats
    chatList,
    chatMemberList,
    // channels
    channelCreate,
    channelDelete,
    channelGet,
    channelJoin,
    channelLeave,
    channelList,
    channelMemberAdd,
    channelMemberList,
    channelMemberRemove,
    channelUpdate,
    // teams
    teamList,
    teamGet,
    // messages
    messageList,
    messageGet,
    messagePostChannel,
    messagePostChat,
    messagePostUser,
    messagePostBot,
    messageEdit,
    messageDelete,
    // files
    fileShareChannel,
    fileShareChat,
    fileShareUser,
    // reminders
    reminderCreate,
    reminderList,
    reminderDelete,
    reminderComplete,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and
  // lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;
