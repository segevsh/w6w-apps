import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  LiveChatClient,
  optInt,
  optObject,
  optString,
  optStringList,
} from "../lib/client.ts";

const action: ActionDefinition = {
  key: "start-chat",
  type: "perform",
  idempotent: false,
  resource: "chat",
  title: "Start chat",
  description: "Start a chat, optionally with a customer, extra agents and a first message " +
    "(`POST /v3.6/agent/action/start_chat`). The token's own agent is the requester and is " +
    "added automatically; up to 4 other agents and 1 customer may be listed.",
  params: [
    { key: "customerId", label: "Customer ID", type: "string", hint: "An existing customer id." },
    {
      key: "agentIds",
      label: "Additional agent IDs",
      type: "string",
      hint: "Comma-separated agent ids (emails). Up to 4.",
    },
    {
      key: "text",
      label: "First message",
      type: "text",
      hint: "Sent as a `message` event from the requester, visible to all.",
    },
    {
      key: "groupId",
      label: "Group ID",
      type: "number",
      hint: "Restrict chat access to this group (integer; 0 is the default group).",
      validation: { min: 0, integer: true },
    },
    {
      key: "active",
      label: "Active",
      type: "boolean",
      hint: "False creates an inactive thread. LiveChat's default is true.",
    },
    {
      key: "continuous",
      label: "Continuous",
      type: "boolean",
      hint: "True starts the chat as continuous (no online group required). Default false.",
    },
    {
      key: "properties",
      label: "Chat properties (JSON)",
      type: "json",
      hint: 'Object keyed namespace → name → value, e.g. {"routing":{"pinned":true}}.',
    },
  ],
  output: [
    { key: "chatId", type: "string", label: "The new chat's id" },
    { key: "threadId", type: "string", label: "The new thread's id" },
    { key: "eventIds", type: "array", label: "Ids of the initial events, when any were sent" },
  ],

  async execute(input, ctx) {
    const users: Array<{ id: string; type: string }> = [];
    const customerId = optString(input.customerId);
    if (customerId) users.push({ id: customerId, type: "customer" });
    const agents = optStringList(input.agentIds, "agentIds") ?? [];
    if (agents.length > 4) throw new Error("`agentIds` allows at most 4 additional agents");
    for (const id of agents) users.push({ id, type: "agent" });

    const groupId = optInt(input.groupId, "groupId", 0, Number.MAX_SAFE_INTEGER);
    const text = optString(input.text);
    const chat = compact({
      users: users.length ? users : undefined,
      access: groupId === undefined ? undefined : { group_ids: [groupId] },
      properties: optObject(input.properties, "properties"),
      thread: text ? { events: [{ type: "message", text, visibility: "all" }] } : undefined,
    });

    const res = await new LiveChatClient(ctx).agent<Record<string, unknown>>("start_chat", {
      ...(Object.keys(chat).length ? { chat } : {}),
      ...(typeof input.active === "boolean" ? { active: input.active } : {}),
      ...(typeof input.continuous === "boolean" ? { continuous: input.continuous } : {}),
    });
    return { chatId: res.chat_id, threadId: res.thread_id, eventIds: res.event_ids ?? [] };
  },
};

export default action;
