import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";
import service from "./health/service.ts";
import site from "./health/site.ts";
import quota from "./health/quota.ts";

import sendMessage from "./actions/send-message.ts";
import getMessages from "./actions/get-messages.ts";
import getMessage from "./actions/get-message.ts";
import updateMessage from "./actions/update-message.ts";
import deleteMessage from "./actions/delete-message.ts";
import addReaction from "./actions/add-reaction.ts";
import removeReaction from "./actions/remove-reaction.ts";
import updateMessageFlags from "./actions/update-message-flags.ts";
import markTopicAsRead from "./actions/mark-topic-as-read.ts";
import markStreamAsRead from "./actions/mark-stream-as-read.ts";
import getStreams from "./actions/get-streams.ts";
import getStream from "./actions/get-stream.ts";
import getStreamId from "./actions/get-stream-id.ts";
import createChannel from "./actions/create-channel.ts";
import updateStream from "./actions/update-stream.ts";
import archiveStream from "./actions/archive-stream.ts";
import getStreamTopics from "./actions/get-stream-topics.ts";
import deleteTopic from "./actions/delete-topic.ts";
import getSubscribers from "./actions/get-subscribers.ts";
import getSubscriptions from "./actions/get-subscriptions.ts";
import subscribe from "./actions/subscribe.ts";
import unsubscribe from "./actions/unsubscribe.ts";
import getUsers from "./actions/get-users.ts";
import getUser from "./actions/get-user.ts";
import getOwnUser from "./actions/get-own-user.ts";

export default {
  actions: [
    sendMessage,
    getMessages,
    getMessage,
    updateMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    updateMessageFlags,
    markTopicAsRead,
    markStreamAsRead,
    getStreams,
    getStream,
    getStreamId,
    createChannel,
    updateStream,
    archiveStream,
    getStreamTopics,
    deleteTopic,
    getSubscribers,
    getSubscriptions,
    subscribe,
    unsubscribe,
    getUsers,
    getUser,
    getOwnUser,
  ],
  auth: [basic],
  healthChecks: [service, site, quota],
} satisfies AppDefinition;
