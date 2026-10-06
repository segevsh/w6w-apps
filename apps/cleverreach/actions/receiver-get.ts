import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, optString, pathId } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "receiver-get",
  type: "read",
  resource: "receiver",
  title: "Get a receiver",
  description:
    "Fetch one receiver by id or email (`GET /v3/receivers/{id}`). Pass a group id to include that group's specific information.",
  params: [
    { key: "receiver", label: "Receiver ID or email", type: "string", required: true, default: "" },
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      hint: "Without it, group-specific information is empty.",
    },
  ],
  output: [
    { key: "item", type: "object", label: "The record as CleverReach returned it" },
  ],

  async execute(input, ctx) {
    return {
      item: await new CleverReachClient(ctx).request(
        `/receivers/${pathId(input.receiver, "receiver")}`,
        {
          query: { group_id: optString(input.groupId) },
        },
      ),
    };
  },
};

export default action;
