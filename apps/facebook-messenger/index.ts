/**
 * Facebook Messenger — the Messenger Platform for a Facebook Page: Send API, Conversations API,
 * Messenger Profile API, Attachment Upload API and Conversation Routing thread control.
 *
 * Distinct from `facebook` (Pages, posts, comments) and `whatsapp`; it shares only the Graph host.
 */
import type { AppDefinition } from "@w6w/types";
import pageToken from "./auth/page-token.ts";
import deleteMessengerProfileFields from "./actions/delete-messenger-profile-fields.ts";
import getMessage from "./actions/get-message.ts";
import getMessengerProfile from "./actions/get-messenger-profile.ts";
import getPageStatus from "./actions/get-page-status.ts";
import listConversationMessages from "./actions/list-conversation-messages.ts";
import listConversations from "./actions/list-conversations.ts";
import passThreadControl from "./actions/pass-thread-control.ts";
import sendAttachment from "./actions/send-attachment.ts";
import sendButtonTemplate from "./actions/send-button-template.ts";
import sendGenericTemplate from "./actions/send-generic-template.ts";
import sendQuickReplies from "./actions/send-quick-replies.ts";
import sendSenderAction from "./actions/send-sender-action.ts";
import sendTextMessage from "./actions/send-text-message.ts";
import setGreeting from "./actions/set-greeting.ts";
import setIceBreakers from "./actions/set-ice-breakers.ts";
import setMessengerProfile from "./actions/set-messenger-profile.ts";
import setPersistentMenu from "./actions/set-persistent-menu.ts";
import takeThreadControl from "./actions/take-thread-control.ts";
import uploadAttachment from "./actions/upload-attachment.ts";
import api from "./health/api.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    deleteMessengerProfileFields,
    getMessage,
    getMessengerProfile,
    getPageStatus,
    listConversationMessages,
    listConversations,
    passThreadControl,
    sendAttachment,
    sendButtonTemplate,
    sendGenericTemplate,
    sendQuickReplies,
    sendSenderAction,
    sendTextMessage,
    setGreeting,
    setIceBreakers,
    setMessengerProfile,
    setPersistentMenu,
    takeThreadControl,
    uploadAttachment,
  ],
  auth: [pageToken],
  healthChecks: [api, service, quota],
} satisfies AppDefinition;
