import type { ActionDefinition } from "@w6w/types";
import {
  LiveChatClient,
  optIntList,
  optString,
  optStringList,
  PAGE_OUTPUT,
  pageInfo,
  PAGING_PARAMS,
  pagingBody,
} from "../lib/client.ts";

const action: ActionDefinition = {
  key: "list-archives",
  type: "search",
  resource: "chat",
  title: "List archived chats",
  description:
    "Search chat history by thread (`POST /v3.6/agent/action/list_archives`). The same chat can " +
    "appear several times, once per matching thread; each item is a complete chat object.",
  params: [
    { key: "query", label: "Text query", type: "string" },
    {
      key: "from",
      label: "From",
      type: "string",
      hint: "RFC 3339 with microseconds, e.g. 2026-01-01T00:00:00.000000+00:00.",
    },
    { key: "to", label: "To", type: "string", hint: "RFC 3339 with microseconds." },
    {
      key: "chatIds",
      label: "Chat IDs",
      type: "string",
      hint: "Comma-separated. Maximum 1000.",
    },
    {
      key: "groupIds",
      label: "Group IDs",
      type: "string",
      hint: "Comma-separated integers. Maximum 200.",
    },
    { key: "customerId", label: "Customer ID", type: "string" },
    { key: "customerEmail", label: "Customer email", type: "string" },
    {
      key: "agentIds",
      label: "Agent IDs",
      type: "string",
      hint: "Comma-separated agent ids (emails); only chats with these agents.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated; only threads carrying any of these tags.",
    },
    ...PAGING_PARAMS,
  ],
  output: [
    { key: "chats", type: "array", label: "Chats (one per matching thread)" },
    { key: "found", type: "number", label: "Estimated total found" },
    ...PAGE_OUTPUT,
  ],

  async execute(input, ctx) {
    const filters: Record<string, unknown> = {};
    const set = (k: string, v: unknown) => {
      if (v !== undefined) filters[k] = v;
    };
    set("query", optString(input.query));
    set("from", optString(input.from));
    set("to", optString(input.to));
    const chatIds = optStringList(input.chatIds, "chatIds");
    if (chatIds && chatIds.length > 1000) throw new Error("`chatIds` allows at most 1000 ids");
    set("chat_ids", chatIds);
    const groupIds = optIntList(input.groupIds, "groupIds");
    if (groupIds && groupIds.length > 200) throw new Error("`groupIds` allows at most 200 ids");
    set("group_ids", groupIds);
    set("customer_id", optString(input.customerId));
    set("customer_email", optString(input.customerEmail));
    const agents = optStringList(input.agentIds, "agentIds");
    if (agents) filters.agents = { values: agents };
    const tags = optStringList(input.tags, "tags");
    if (tags) filters.tags = { values: tags };

    const body = pagingBody(input, Object.keys(filters).length ? { filters } : {});
    const res = await new LiveChatClient(ctx).agent<Record<string, unknown>>("list_archives", body);
    return { chats: res.chats ?? [], found: res.found_chats, ...pageInfo(res) };
  },
};

export default action;
