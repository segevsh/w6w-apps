import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, pathId } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "group-delete",
  type: "perform",
  resource: "group",
  title: "Delete a group",
  description:
    "Delete a group (receiver list) (`DELETE /v3/groups/{id}`). A group marked `locked` cannot be deleted.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "result", type: "object", label: "CleverReach's response body" },
  ],

  async execute(input, ctx) {
    return {
      result: await new CleverReachClient(ctx).request(
        `/groups/${pathId(input.groupId, "groupId")}`,
        { method: "DELETE" },
      ),
    };
  },
};

export default action;
