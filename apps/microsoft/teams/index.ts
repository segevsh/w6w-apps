import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

// team
import listTeams from "./actions/list-teams.ts";
import getTeam from "./actions/get-team.ts";

// team member
import listTeamMembers from "./actions/list-team-members.ts";
import addTeamMember from "./actions/add-team-member.ts";

// channel
import listChannels from "./actions/list-channels.ts";
import getChannel from "./actions/get-channel.ts";
import getPrimaryChannel from "./actions/get-primary-channel.ts";

// channel member
import listChannelMembers from "./actions/list-channel-members.ts";

// channel message
import sendChannelMessage from "./actions/send-channel-message.ts";
import listChannelMessages from "./actions/list-channel-messages.ts";
import getChannelMessage from "./actions/get-channel-message.ts";
import replyToChannelMessage from "./actions/reply-to-channel-message.ts";
import listMessageReplies from "./actions/list-message-replies.ts";

// chat
import listChats from "./actions/list-chats.ts";

// chat message
import listChatMessages from "./actions/list-chat-messages.ts";
import sendChatMessage from "./actions/send-chat-message.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listTeams,
    getTeam,
    listTeamMembers,
    addTeamMember,
    listChannels,
    getChannel,
    getPrimaryChannel,
    listChannelMembers,
    sendChannelMessage,
    listChannelMessages,
    getChannelMessage,
    replyToChannelMessage,
    listMessageReplies,
    listChats,
    listChatMessages,
    sendChatMessage,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
