import type { ActionDefinition } from "@w6w/types";
import { asList, LIST_OUTPUT, LiveChatClient, optIntList } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "list-routing-statuses",
  type: "search",
  resource: "agent",
  title: "List routing statuses",
  description: "Each agent's current chat-routing status, optionally for given groups only " +
    "(`POST /v3.6/agent/action/list_routing_statuses`). Needs `agents--all:ro` and " +
    "`agents-bot--all:ro`.",
  params: [
    {
      key: "groupIds",
      label: "Group IDs",
      type: "string",
      hint: "Comma-separated integers.",
    },
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const groupIds = optIntList(input.groupIds, "groupIds");
    return asList(
      await new LiveChatClient(ctx).agent(
        "list_routing_statuses",
        groupIds ? { filters: { group_ids: groupIds } } : {},
      ),
    );
  },
};

export default action;
