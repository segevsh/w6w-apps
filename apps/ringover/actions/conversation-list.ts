import type { ActionDefinition } from "@w6w/types";
import { listOf, numberOf, RingoverClient, strList } from "../lib/client.ts";
import { limitParam, offsetParam } from "../lib/params.ts";

interface Input {
  filter?: string[] | string;
  limitCount?: number;
  limitOffset?: number;
}

const conversationList: ActionDefinition<Input> = {
  key: "conversation-list",
  type: "read",
  resource: "conversation",
  title: "List Conversations",
  description:
    "List SMS and chat conversations (first 100 by default). Without Monitoring on the key only your own are returned.",
  params: [
    {
      key: "filter",
      label: "Type",
      type: "multiselect",
      options: [{ value: "ALL", label: "All" }, { value: "INTERNAL", label: "Internal" }, {
        value: "EXTERNAL",
        label: "External",
      }, { value: "COLLABORATIVE", label: "Collaborative" }],
    },
    limitParam(1000),
    offsetParam,
  ],
  output: [
    { key: "conversations", type: "array", label: "Conversations" },
    { key: "count", type: "number", label: "Conversations in this page" },
    { key: "total", type: "number", label: "Total conversations" },
  ],

  async execute(input, ctx) {
    const body = await new RingoverClient(ctx).request("GET", "/conversations", {
      query: {
        filter: strList(input.filter),
        limit_count: input.limitCount,
        limit_offset: input.limitOffset,
      },
    });
    return {
      conversations: listOf(body, "conversation_list"),
      count: numberOf(body, "conversation_list_count"),
      total: numberOf(body, "total_conversation_count"),
    };
  },
};

export default conversationList;
