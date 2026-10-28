import type { ActionDefinition } from "@w6w/types";
import { compact, toList, unwrapData, ZohoCliqClient } from "../lib/client.ts";

interface Input {
  content?: string;
  time?: number;
  userIds?: string | string[];
  emailIds?: string | string[];
  chatId?: string;
  messageId?: string;
}

interface Output {
  reminder: Record<string, unknown>;
}

/**
 * `POST /api/v2/reminders` — scope `ZohoCliq.Reminders.CREATE` (or `.ALL`).
 * The reference documents four body shapes on the one endpoint:
 *   - self reminder: `{ content, time? }`
 *   - for other users: `{ content, time?, user_ids | email_ids }` (max 4)
 *   - for a chat/channel: `{ content, time, chat_ids: [one chat] }`
 *   - a message as reminder: `{ message_id, chat_id, time, content?, user_ids? }`
 */
const reminderCreate: ActionDefinition<Input, Output> = {
  key: "reminder-create",
  type: "perform",
  resource: "reminder",
  title: "Create Reminder",
  description:
    "Create a reminder for yourself, for up to 4 other users, for a chat/channel, or on a message.",
  idempotent: false,
  params: [
    {
      key: "content",
      label: "Content",
      type: "string",
      hint: "Reminder text. Required unless you are setting a message as the reminder.",
    },
    {
      key: "time",
      label: "Trigger time",
      type: "number",
      hint: "Epoch milliseconds. Required for chat and message reminders.",
    },
    {
      key: "userIds",
      label: "Assignee user IDs",
      type: "string",
      hint: "Comma-separated, max 4. Empty means a self reminder.",
    },
    {
      key: "emailIds",
      label: "Assignee emails",
      type: "string",
      hint: "Comma-separated, max 4. Use when the user id is not known.",
    },
    {
      key: "chatId",
      label: "Chat ID",
      type: "string",
      hint:
        "Attach the reminder to this chat/channel (or, with Message ID, to that message's chat).",
    },
    {
      key: "messageId",
      label: "Message ID",
      type: "string",
      hint: "Set this message as the reminder (needs Chat ID and Trigger time).",
    },
  ],
  output: [{ key: "reminder", type: "object", label: "Created reminder" }],

  async execute(input, ctx) {
    const userIds = toList(input.userIds);
    const emailIds = toList(input.emailIds);
    const chatId = input.chatId?.trim();
    const messageId = input.messageId?.trim();
    if (userIds.length + emailIds.length > 4) {
      throw new Error("A reminder can have at most 4 assignees.");
    }

    let body: Record<string, unknown>;
    if (messageId) {
      if (!chatId) throw new Error("`chatId` is required when setting a message as a reminder.");
      if (input.time === undefined) throw new Error("`time` is required for a message reminder.");
      body = compact({
        message_id: messageId,
        chat_id: chatId,
        time: input.time,
        content: input.content,
        user_ids: userIds.length ? userIds : undefined,
        email_ids: emailIds.length ? emailIds : undefined,
      });
    } else if (chatId) {
      if (!input.content) throw new Error("`content` is required for a chat reminder.");
      if (input.time === undefined) throw new Error("`time` is required for a chat reminder.");
      body = { content: input.content, time: input.time, chat_ids: [chatId] };
    } else {
      if (!input.content) throw new Error("`content` is required for a reminder.");
      body = compact({
        content: input.content,
        time: input.time,
        user_ids: userIds.length ? userIds : undefined,
        email_ids: emailIds.length ? emailIds : undefined,
      });
    }

    const res = await new ZohoCliqClient(ctx).request("/reminders", { method: "POST", body });
    return { reminder: unwrapData(res) };
  },
};

export default reminderCreate;
