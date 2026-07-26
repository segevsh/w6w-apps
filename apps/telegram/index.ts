/**
 * Telegram — w6w port of n8n's `Telegram` node (Bot API).
 *
 * Covers the message, chat, file and callback resources. Two capabilities from
 * the n8n node are deliberately absent:
 *
 *   - **multipart uploads.** Telegram accepts media as a `file_id`, a public
 *     HTTP(S) URL, or a multipart body. Only the first two are reachable here:
 *     streaming raw bytes out of the action sandbox is not something `ctx.fetch`
 *     is meant to do.
 *   - **`getUpdates` polling / the Telegram trigger.** That is a Trigger, not an
 *     Action; port it against `rfcs/trigger.md` when this pack takes on triggers.
 */
import type { AppDefinition } from "@w6w/types";
import botToken from "./auth/bot-token.ts";

import messageSend from "./actions/message-send.ts";
import messageEdit from "./actions/message-edit.ts";
import messageDelete from "./actions/message-delete.ts";
import messagePin from "./actions/message-pin.ts";
import messageUnpin from "./actions/message-unpin.ts";
import messageSendPhoto from "./actions/message-send-photo.ts";
import messageSendDocument from "./actions/message-send-document.ts";
import messageSendVideo from "./actions/message-send-video.ts";
import messageSendAudio from "./actions/message-send-audio.ts";
import messageSendAnimation from "./actions/message-send-animation.ts";
import messageSendSticker from "./actions/message-send-sticker.ts";
import messageSendLocation from "./actions/message-send-location.ts";
import messageSendChatAction from "./actions/message-send-chat-action.ts";

import chatGet from "./actions/chat-get.ts";
import chatGetAdministrators from "./actions/chat-get-administrators.ts";
import chatGetMember from "./actions/chat-get-member.ts";
import chatLeave from "./actions/chat-leave.ts";
import chatSetTitle from "./actions/chat-set-title.ts";
import chatSetDescription from "./actions/chat-set-description.ts";

import fileGet from "./actions/file-get.ts";
import callbackAnswerQuery from "./actions/callback-answer-query.ts";

export default {
  actions: [
    // message
    messageSend,
    messageEdit,
    messageDelete,
    messagePin,
    messageUnpin,
    messageSendPhoto,
    messageSendDocument,
    messageSendVideo,
    messageSendAudio,
    messageSendAnimation,
    messageSendSticker,
    messageSendLocation,
    messageSendChatAction,
    // chat
    chatGet,
    chatGetAdministrators,
    chatGetMember,
    chatLeave,
    chatSetTitle,
    chatSetDescription,
    // file
    fileGet,
    // callback
    callbackAnswerQuery,
  ],
  auth: [botToken],
} satisfies AppDefinition;
