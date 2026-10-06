import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, pathId } from "../lib/client.ts";
import { receiverBody, receiverFieldParams } from "../lib/receiver.ts";

const action: ActionDefinition = {
  key: "receiver-update",
  type: "perform",
  resource: "receiver",
  title: "Update a receiver",
  description:
    "Change a receiver's data within a group (`PUT /v3/groups/{group_id}/receivers/{id}`). The email cannot be changed. Leave `deactivated` out unless you mean it.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
    { key: "receiver", label: "Receiver ID or email", type: "string", required: true, default: "" },
    ...receiverFieldParams,
  ],
  output: [
    { key: "item", type: "object", label: "The record as CleverReach returned it" },
  ],

  async execute(input, ctx) {
    const body = receiverBody(input as Record<string, unknown>);
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update: set at least one field");
    }
    const id = pathId(input.receiver, "receiver");
    return {
      item: await new CleverReachClient(ctx).request(
        `/groups/${pathId(input.groupId, "groupId")}/receivers/${id}`,
        {
          method: "PUT",
          body,
        },
      ),
    };
  },
};

export default action;
