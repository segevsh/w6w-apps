import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, pathId } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get a group",
  description: "Fetch one group (receiver list) by id (`GET /v3/groups/{id}`).",
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "item", type: "object", label: "The record as CleverReach returned it" },
  ],

  async execute(input, ctx) {
    return {
      item: await new CleverReachClient(ctx).request(`/groups/${pathId(input.groupId, "groupId")}`),
    };
  },
};

export default action;
