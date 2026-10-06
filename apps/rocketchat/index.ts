import type { AppDefinition } from "@w6w/types";
import personalAccessToken from "./auth/personal-access-token.ts";

import postMessage from "./actions/post-message.ts";
import sendMessage from "./actions/send-message.ts";
import updateMessage from "./actions/update-message.ts";
import deleteMessage from "./actions/delete-message.ts";
import getMessage from "./actions/get-message.ts";
import searchMessages from "./actions/search-messages.ts";
import reactToMessage from "./actions/react-to-message.ts";
import pinMessage from "./actions/pin-message.ts";
import listChannels from "./actions/list-channels.ts";
import getChannel from "./actions/get-channel.ts";
import createChannel from "./actions/create-channel.ts";
import inviteToChannel from "./actions/invite-to-channel.ts";
import getChannelHistory from "./actions/get-channel-history.ts";
import listChannelMembers from "./actions/list-channel-members.ts";
import setChannelTopic from "./actions/set-channel-topic.ts";
import listGroups from "./actions/list-groups.ts";
import getGroup from "./actions/get-group.ts";
import createGroup from "./actions/create-group.ts";
import inviteToGroup from "./actions/invite-to-group.ts";
import getGroupHistory from "./actions/get-group-history.ts";
import createDm from "./actions/create-dm.ts";
import getDmHistory from "./actions/get-dm-history.ts";
import getUser from "./actions/get-user.ts";
import listUsers from "./actions/list-users.ts";
import getMe from "./actions/get-me.ts";

import service from "./health/service.ts";
import site from "./health/site.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    postMessage,
    sendMessage,
    updateMessage,
    deleteMessage,
    getMessage,
    searchMessages,
    reactToMessage,
    pinMessage,
    listChannels,
    getChannel,
    createChannel,
    inviteToChannel,
    getChannelHistory,
    listChannelMembers,
    setChannelTopic,
    listGroups,
    getGroup,
    createGroup,
    inviteToGroup,
    getGroupHistory,
    createDm,
    getDmHistory,
    getUser,
    listUsers,
    getMe,
  ],
  auth: [personalAccessToken],
  healthChecks: [service, site, quota],
} satisfies AppDefinition;
