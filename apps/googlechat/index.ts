import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import listSpaces from "./actions/list-spaces.ts";
import getSpace from "./actions/get-space.ts";
import createSpace from "./actions/create-space.ts";
import setupSpace from "./actions/setup-space.ts";
import updateSpace from "./actions/update-space.ts";
import findDirectMessage from "./actions/find-direct-message.ts";

import createMessage from "./actions/create-message.ts";
import getMessage from "./actions/get-message.ts";
import listMessages from "./actions/list-messages.ts";
import searchMessages from "./actions/search-messages.ts";
import updateMessage from "./actions/update-message.ts";
import deleteMessage from "./actions/delete-message.ts";

import listMembers from "./actions/list-members.ts";
import createMember from "./actions/create-member.ts";
import deleteMember from "./actions/delete-member.ts";

import createReaction from "./actions/create-reaction.ts";
import listReactions from "./actions/list-reactions.ts";
import deleteReaction from "./actions/delete-reaction.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // spaces
    listSpaces,
    getSpace,
    createSpace,
    setupSpace,
    updateSpace,
    findDirectMessage,
    // messages
    createMessage,
    getMessage,
    listMessages,
    searchMessages,
    updateMessage,
    deleteMessage,
    // memberships
    listMembers,
    createMember,
    deleteMember,
    // reactions
    createReaction,
    listReactions,
    deleteReaction,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
