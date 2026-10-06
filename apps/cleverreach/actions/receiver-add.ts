import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, pathId } from "../lib/client.ts";
import { receiverBody, receiverFieldParams } from "../lib/receiver.ts";

const action: ActionDefinition = {
  key: "receiver-add",
  type: "perform",
  resource: "receiver",
  title: "Add a receiver",
  description:
    "Create a receiver in a group (`POST /v3/groups/{group_id}/receivers`). Omitting `registered`, `activated` and `deactivated` creates an ACTIVATED receiver; provide `activated` only to skip double-opt-in. Not idempotent: an existing email is refused by CleverReach (use Upsert receivers to update-or-create).",
  idempotent: false,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
    { key: "email", label: "Email", type: "string", required: true, default: "" },
    ...receiverFieldParams,
  ],
  output: [
    { key: "item", type: "object", label: "The record as CleverReach returned it" },
  ],

  async execute(input, ctx) {
    const body = receiverBody(input as Record<string, unknown>);
    if (!body.email) throw new Error("`email` is required");
    return {
      item: await new CleverReachClient(ctx).request(
        `/groups/${pathId(input.groupId, "groupId")}/receivers`,
        {
          method: "POST",
          body,
        },
      ),
    };
  },
};

export default action;
