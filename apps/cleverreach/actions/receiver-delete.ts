import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, optString, pathId } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "receiver-delete",
  type: "perform",
  resource: "receiver",
  title: "Delete a receiver",
  description:
    "Delete a receiver by id or email (`DELETE /v3/receivers/{id}`). The optional group id is sent as the vendor's `group_id` query; the spec gives it no further explanation, so try it on a test account before relying on a group-scoped delete.",
  idempotent: true,
  params: [
    { key: "receiver", label: "Receiver ID or email", type: "string", required: true, default: "" },
    { key: "groupId", label: "Group ID", type: "string" },
  ],
  output: [
    { key: "result", type: "object", label: "CleverReach's response body" },
  ],

  async execute(input, ctx) {
    return {
      result: await new CleverReachClient(ctx).request(
        `/receivers/${pathId(input.receiver, "receiver")}`,
        {
          method: "DELETE",
          query: { group_id: optString(input.groupId) },
        },
      ),
    };
  },
};

export default action;
