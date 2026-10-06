import type { ActionDefinition } from "@w6w/types";
import { LiveChatClient, optEnum, optObject, optString, requireString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "send-event",
  type: "perform",
  idempotent: false,
  resource: "event",
  title: "Send message",
  description: "Send a message (or any other event object) into a chat " +
    "(`POST /v3.6/agent/action/send_event`). The sender must already be a user of the chat. " +
    "Events with visibility `agents` are internal notes.",
  params: [
    { key: "chatId", label: "Chat ID", type: "string", required: true },
    {
      key: "text",
      label: "Message text",
      type: "text",
      hint: "Sent as a `message` event. Ignored when `Event (JSON)` is set.",
    },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      options: [
        { value: "all", label: "Everyone in the chat (default)" },
        { value: "agents", label: "Agents only (internal note)" },
      ],
    },
    {
      key: "event",
      label: "Event (JSON)",
      type: "json",
      hint:
        "A complete event object, for event types other than a plain message. Replaces text and visibility.",
    },
  ],
  output: [{ key: "eventId", type: "string", label: "The new event's id" }],

  async execute(input, ctx) {
    const chatId = requireString(input.chatId, "chatId");
    const custom = optObject(input.event, "event");
    let event: Record<string, unknown>;
    if (custom) {
      event = custom;
    } else {
      event = {
        type: "message",
        text: requireString(input.text, "text"),
        visibility: optEnum(input.visibility, "visibility", ["all", "agents"] as const) ?? "all",
      };
    }
    const res = await new LiveChatClient(ctx).agent<{ event_id?: string }>("send_event", {
      chat_id: chatId,
      event,
    });
    return { eventId: optString(res.event_id) };
  },
};

export default action;
