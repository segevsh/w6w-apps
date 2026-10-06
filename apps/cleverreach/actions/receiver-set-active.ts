import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, pathId } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "receiver-set-active",
  type: "perform",
  resource: "receiver",
  title: "Activate or deactivate a receiver",
  description:
    "Set a receiver's status within a group: `PUT /v3/groups/{group_id}/receivers/{id}/activate` or `/deactivate`.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
    { key: "receiver", label: "Receiver ID or email", type: "string", required: true, default: "" },
    {
      key: "active",
      label: "Active",
      type: "boolean",
      required: true,
      hint: "On activates, off deactivates.",
    },
  ],
  output: [
    { key: "result", type: "object", label: "CleverReach's response body" },
  ],

  async execute(input, ctx) {
    if (typeof input.active !== "boolean") throw new Error("`active` is required (true or false)");
    const id = pathId(input.receiver, "receiver");
    const group = pathId(input.groupId, "groupId");
    return {
      result: await new CleverReachClient(ctx).request(
        `/groups/${group}/receivers/${id}/${input.active ? "activate" : "deactivate"}`,
        { method: "PUT" },
      ),
    };
  },
};

export default action;
