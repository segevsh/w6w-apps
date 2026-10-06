import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, need, seg } from "../lib/client.ts";
import { idParam, type Input } from "../lib/factory.ts";

/** `POST /messages/{id}/send` with an empty JSON object. */
const action: ActionDefinition<Input> = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description:
    "Send a draft message to its targeted list NOW. It must have subject, body, from and reply-to, be in draft status, and target at least one person. This emails real people and cannot be undone once sent.",
  idempotent: false,
  params: [idParam("messageId", "Message ID")],
  output: [{ key: "message", type: "string", label: "Confirmation from the vendor" }],

  execute(input, ctx) {
    return new ActionNetworkClient(ctx).request(
      "POST",
      `/messages/${seg(need(input, "messageId"))}/send`,
      { body: {} },
    );
  },
};

export default action;
