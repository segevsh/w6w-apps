import type { ActionDefinition } from "@w6w/types";
import {
  LiveChatClient,
  optString,
  PAGE_OUTPUT,
  pageInfo,
  PAGING_PARAMS,
  pagingBody,
  requireString,
} from "../lib/client.ts";

const action: ActionDefinition = {
  key: "list-threads",
  type: "search",
  resource: "thread",
  title: "List threads",
  description:
    "Threads of one chat, with their events (`POST /v3.6/agent/action/list_threads`). LiveChat " +
    "returns only 3 threads per page unless `limit` is set.",
  params: [
    { key: "chatId", label: "Chat ID", type: "string", required: true },
    {
      key: "from",
      label: "From",
      type: "string",
      hint: "RFC 3339 with microseconds, e.g. 2026-01-01T00:00:00.000000+00:00.",
    },
    { key: "to", label: "To", type: "string", hint: "RFC 3339 with microseconds." },
    ...PAGING_PARAMS,
  ],
  output: [
    { key: "threads", type: "array", label: "Threads, each with its events" },
    { key: "found", type: "number", label: "Estimated total found" },
    ...PAGE_OUTPUT,
  ],

  async execute(input, ctx) {
    const chatId = requireString(input.chatId, "chatId");
    const from = optString(input.from);
    const to = optString(input.to);
    const filters: Record<string, unknown> = {};
    if (from) filters.from = from;
    if (to) filters.to = to;
    const paging = pagingBody(input, Object.keys(filters).length ? { filters } : {});
    const res = await new LiveChatClient(ctx).agent<Record<string, unknown>>("list_threads", {
      chat_id: chatId,
      ...paging,
    });
    return { threads: res.threads ?? [], found: res.found_threads, ...pageInfo(res) };
  },
};

export default action;
