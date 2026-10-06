import type { ActionDefinition } from "@w6w/types";
import {
  LiveChatClient,
  optEnum,
  optIntList,
  optStringList,
  requireString,
} from "../lib/client.ts";

const action: ActionDefinition = {
  key: "transfer-chat",
  type: "perform",
  idempotent: false,
  resource: "chat",
  title: "Transfer chat",
  description:
    "Transfer an active chat to agents or groups (`POST /v3.6/agent/action/transfer_chat`). " +
    "Without a target the chat is transferred within its current group.",
  params: [
    { key: "chatId", label: "Chat ID", type: "string", required: true },
    {
      key: "targetType",
      label: "Target type",
      type: "select",
      options: [
        { value: "group", label: "Group" },
        { value: "agent", label: "Agent" },
      ],
      hint: "Leave empty (with no target IDs) to transfer within the current group.",
    },
    {
      key: "targetIds",
      label: "Target IDs",
      type: "string",
      hint: "Comma-separated: integer group ids, or agent ids (emails).",
    },
    {
      key: "ignoreAgentsAvailability",
      label: "Ignore agents' availability",
      type: "boolean",
      hint:
        "True lets the chat be queued if nobody is free. False (default) fails when no agent can take it immediately.",
    },
    {
      key: "ignoreRequesterPresence",
      label: "Ignore requester presence",
      type: "boolean",
    },
  ],
  output: [{ key: "transferred", type: "boolean", label: "True when LiveChat accepted the call" }],

  async execute(input, ctx) {
    const type = optEnum(input.targetType, "targetType", ["group", "agent"] as const);
    const ids = type === "group"
      ? optIntList(input.targetIds, "targetIds")
      : optStringList(input.targetIds, "targetIds");
    if (type && !ids) throw new Error("`targetIds` is required when `targetType` is set");
    if (!type && ids) throw new Error("`targetType` is required when `targetIds` is set");
    await new LiveChatClient(ctx).agent("transfer_chat", {
      id: requireString(input.chatId, "chatId"),
      ...(type ? { target: { type, ids } } : {}),
      ...(typeof input.ignoreAgentsAvailability === "boolean"
        ? { ignore_agents_availability: input.ignoreAgentsAvailability }
        : {}),
      ...(typeof input.ignoreRequesterPresence === "boolean"
        ? { ignore_requester_presence: input.ignoreRequesterPresence }
        : {}),
    });
    return { transferred: true };
  },
};

export default action;
