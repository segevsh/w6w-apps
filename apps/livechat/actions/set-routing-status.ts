import type { ActionDefinition } from "@w6w/types";
import { compact, LiveChatClient, optEnum, optString } from "../lib/client.ts";

const STATUSES = ["accepting_chats", "not_accepting_chats", "offline"] as const;

const action: ActionDefinition = {
  key: "set-routing-status",
  type: "perform",
  idempotent: true,
  resource: "agent",
  title: "Set routing status",
  description: "Change whether an agent (or bot agent) receives chats " +
    "(`POST /v3.6/agent/action/set_routing_status`). Without an agent id it changes the token's " +
    "own agent. `offline` is valid for bot agents only.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "accepting_chats", label: "Accepting chats" },
        { value: "not_accepting_chats", label: "Not accepting chats" },
        { value: "offline", label: "Offline (bot agents only)" },
      ],
    },
    {
      key: "agentId",
      label: "Agent ID",
      type: "string",
      hint: "Agent id (email). Default: the token's own agent.",
    },
  ],
  output: [{ key: "updated", type: "boolean", label: "True when LiveChat accepted the call" }],

  async execute(input, ctx) {
    const status = optEnum(input.status, "status", STATUSES);
    if (!status) throw new Error("`status` is required");
    await new LiveChatClient(ctx).agent(
      "set_routing_status",
      compact({ status, agent_id: optString(input.agentId) }),
    );
    return { updated: true };
  },
};

export default action;
