import type { ActionDefinition } from "@w6w/types";
import { LiveChatClient, requireString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "deactivate-chat",
  type: "perform",
  idempotent: false,
  resource: "chat",
  title: "Close chat",
  description:
    "Deactivate a chat by closing its open thread (`POST /v3.6/agent/action/deactivate_chat`). " +
    "Messages can no longer be sent to that thread. Closing an already-closed chat is an error " +
    "(`chat_inactive`), so this is not marked idempotent.",
  params: [
    { key: "chatId", label: "Chat ID", type: "string", required: true },
    {
      key: "ignoreRequesterPresence",
      label: "Ignore requester presence",
      type: "boolean",
      hint:
        "By default the token's agent must be among the chat's users. Set true to close the chat anyway.",
    },
  ],
  output: [{ key: "closed", type: "boolean", label: "True when LiveChat accepted the call" }],

  async execute(input, ctx) {
    await new LiveChatClient(ctx).agent("deactivate_chat", {
      id: requireString(input.chatId, "chatId"),
      ...(typeof input.ignoreRequesterPresence === "boolean"
        ? { ignore_requester_presence: input.ignoreRequesterPresence }
        : {}),
    });
    return { closed: true };
  },
};

export default action;
