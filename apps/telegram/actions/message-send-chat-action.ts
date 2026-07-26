import type { ActionDefinition } from "@w6w/types";
import { TelegramClient } from "../lib/client.ts";
import { chatId } from "../lib/params.ts";

interface Input {
  chatId: string;
  action: string;
  messageThreadId?: number;
}

/**
 * The "…is typing" indicator. Telegram clears it after 5 seconds or when the
 * next message arrives, so this is normally fired immediately before a slow
 * step whose result gets sent afterwards.
 */
const messageSendChatAction: ActionDefinition<Input, boolean> = {
  key: "message-send-chat-action",
  type: "perform",
  resource: "message",
  title: "Send Chat Action",
  description: "Show a status indicator ('typing…', 'sending photo…') in a chat.",
  idempotent: true,
  params: [
    chatId,
    {
      key: "action",
      label: "Action",
      type: "select",
      required: true,
      default: "typing",
      options: [
        { value: "typing", label: "Typing" },
        { value: "upload_photo", label: "Uploading photo" },
        { value: "record_video", label: "Recording video" },
        { value: "upload_video", label: "Uploading video" },
        { value: "record_voice", label: "Recording voice" },
        { value: "upload_voice", label: "Uploading voice" },
        { value: "upload_document", label: "Uploading document" },
        { value: "choose_sticker", label: "Choosing sticker" },
        { value: "find_location", label: "Finding location" },
        { value: "record_video_note", label: "Recording video note" },
        { value: "upload_video_note", label: "Uploading video note" },
      ],
    },
    { key: "messageThreadId", label: "Message thread ID", type: "number" },
  ],
  output: [{ key: "result", type: "boolean", label: "Sent" }],

  execute(input, ctx) {
    return new TelegramClient(ctx).call<boolean>("sendChatAction", {
      body: {
        chat_id: input.chatId,
        action: input.action,
        message_thread_id: input.messageThreadId,
      },
    });
  },
};

export default messageSendChatAction;
