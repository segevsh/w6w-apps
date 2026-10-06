import type { ActionDefinition } from "@w6w/types";
import {
  LiveChatClient,
  optIntList,
  optObject,
  PAGE_OUTPUT,
  pageInfo,
  PAGING_PARAMS,
  pagingBody,
} from "../lib/client.ts";

const action: ActionDefinition = {
  key: "list-chats",
  type: "search",
  resource: "chat",
  title: "List chats",
  description:
    "Summaries of the chats the token can access (`POST /v3.6/agent/action/list_chats`). Filters " +
    "go on the first request only; continue with the returned page id.",
  params: [
    {
      key: "state",
      label: "State",
      type: "select",
      hint: "Active chats, inactive chats, or both (default).",
      options: [
        { value: "active", label: "Active only" },
        { value: "inactive", label: "Inactive only" },
      ],
    },
    {
      key: "groupIds",
      label: "Group IDs",
      type: "string",
      hint: "Comma-separated group ids (integers, 0 is the default group). Maximum 200.",
    },
    {
      key: "includeChatsWithoutThreads",
      label: "Include chats without threads",
      type: "boolean",
      hint: "LiveChat's default is true.",
    },
    {
      key: "properties",
      label: "Property filters (JSON)",
      type: "json",
      hint:
        'Object keyed namespace → name → filter, e.g. {"routing":{"pinned":{"values":[true]}}}. ' +
        "Each filter takes one of `exists`, `values`, `exclude_values`.",
    },
    ...PAGING_PARAMS,
  ],
  output: [
    { key: "chats", type: "array", label: "Chat summaries" },
    {
      key: "found",
      type: "number",
      label: "Estimated total found (LiveChat: may differ slightly)",
    },
    ...PAGE_OUTPUT,
  ],

  async execute(input, ctx) {
    const groupIds = optIntList(input.groupIds, "groupIds");
    if (groupIds && groupIds.length > 200) throw new Error("`groupIds` allows at most 200 ids");
    const filters: Record<string, unknown> = {};
    if (input.state === "active") filters.active = true;
    else if (input.state === "inactive") filters.active = false;
    else if (input.state) throw new Error("`state` must be one of: active, inactive");
    if (groupIds) filters.group_ids = groupIds;
    if (typeof input.includeChatsWithoutThreads === "boolean") {
      filters.include_chats_without_threads = input.includeChatsWithoutThreads;
    }
    const props = optObject(input.properties, "properties");
    if (props) filters.properties = props;

    const body = pagingBody(input, Object.keys(filters).length ? { filters } : {});
    const res = await new LiveChatClient(ctx).agent<Record<string, unknown>>("list_chats", body);
    return { chats: res.chats_summary ?? [], found: res.found_chats, ...pageInfo(res) };
  },
};

export default action;
