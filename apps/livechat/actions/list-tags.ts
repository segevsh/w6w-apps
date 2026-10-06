import type { ActionDefinition } from "@w6w/types";
import { asList, LIST_OUTPUT, LiveChatClient, optIntList } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "list-tags",
  type: "search",
  resource: "tag",
  title: "List tags",
  description:
    "Tags available in the given groups (`POST /v3.6/configuration/action/list_tags`). " +
    "Needs `tags--all:ro` or `tags--groups:ro`. LiveChat requires the group filter.",
  params: [
    {
      key: "groupIds",
      label: "Group IDs",
      type: "string",
      required: true,
      hint: "Comma-separated integers; 0 is the default group.",
    },
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const groupIds = optIntList(input.groupIds, "groupIds");
    if (!groupIds) throw new Error("`groupIds` is required");
    return asList(
      await new LiveChatClient(ctx).config("list_tags", { filters: { group_ids: groupIds } }),
    );
  },
};

export default action;
