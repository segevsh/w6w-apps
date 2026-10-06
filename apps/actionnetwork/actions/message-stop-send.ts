import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, need, seg } from "../lib/client.ts";
import { idParam, type Input } from "../lib/factory.ts";

/** `DELETE /messages/{id}/send` with an empty JSON object. */
const action: ActionDefinition<Input> = {
  key: "message-stop-send",
  type: "perform",
  resource: "message",
  title: "Stop Message Send",
  description:
    "Stop a message that is partway through sending. Anything already delivered stays delivered.",
  idempotent: true,
  params: [idParam("messageId", "Message ID")],
  output: [{ key: "message", type: "string", label: "Confirmation from the vendor" }],

  execute(input, ctx) {
    return new ActionNetworkClient(ctx).request(
      "DELETE",
      `/messages/${seg(need(input, "messageId"))}/send`,
      { body: {} },
    );
  },
};

export default action;
