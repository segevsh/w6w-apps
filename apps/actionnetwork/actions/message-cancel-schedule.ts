import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, need, seg } from "../lib/client.ts";
import { idParam, type Input } from "../lib/factory.ts";

/** `DELETE /messages/{id}/schedule` with an empty JSON object. */
const action: ActionDefinition<Input> = {
  key: "message-cancel-schedule",
  type: "perform",
  resource: "message",
  title: "Cancel Message Schedule",
  description: "Cancel a scheduled message so it will not send at its scheduled time.",
  idempotent: true,
  params: [idParam("messageId", "Message ID")],
  output: [{ key: "message", type: "string", label: "Confirmation from the vendor" }],

  execute(input, ctx) {
    return new ActionNetworkClient(ctx).request(
      "DELETE",
      `/messages/${seg(need(input, "messageId"))}/schedule`,
      { body: {} },
    );
  },
};

export default action;
