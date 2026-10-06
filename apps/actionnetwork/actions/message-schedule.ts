import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, need, seg } from "../lib/client.ts";
import { idParam, type Input } from "../lib/factory.ts";

/** `POST /messages/{id}/schedule`. */
const action: ActionDefinition<Input> = {
  key: "message-schedule",
  type: "perform",
  resource: "message",
  title: "Schedule Message",
  description:
    "Schedule a draft message to send at a future UTC time. It must have subject, body, from and reply-to, be in draft status, and target at least one person; wait for targeting to finish after creating it.",
  idempotent: true,
  params: [idParam("messageId", "Message ID"), {
    key: "scheduledStartDate",
    label: "Send at (UTC)",
    type: "datetime",
    required: true,
    hint: "Must be in the future.",
  }],
  output: [{ key: "message", type: "string", label: "Confirmation from the vendor" }],

  execute(input, ctx) {
    return new ActionNetworkClient(ctx).request(
      "POST",
      `/messages/${seg(need(input, "messageId"))}/schedule`,
      { body: { scheduled_start_date: need(input, "scheduledStartDate") } },
    );
  },
};

export default action;
