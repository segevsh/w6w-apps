import type { ActionDefinition } from "@w6w/types";
import { asList, LIST_OUTPUT, LiveChatClient, optStringList } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "list-groups",
  type: "search",
  resource: "group",
  title: "List groups",
  description:
    "Every group in the license (`POST /v3.6/configuration/action/list_groups`). Needs " +
    "`groups--all:ro`. Group ids are integers; 0 is the default group.",
  params: [
    {
      key: "fields",
      label: "Additional fields",
      type: "multiselect",
      options: [
        { value: "agent_priorities", label: "Agents and their priorities" },
        { value: "routing_status", label: "Routing status" },
      ],
    },
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const fields = optStringList(input.fields, "fields");
    return asList(await new LiveChatClient(ctx).config("list_groups", fields ? { fields } : {}));
  },
};

export default action;
