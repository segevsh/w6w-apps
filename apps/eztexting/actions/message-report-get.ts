import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, EzTextingClient } from "../lib/client.ts";

/** `GET /v1/message-reports/{id}` — delivery, engagement and link-click report for a message. */
interface Input {
  id: string;
}

const messageReportGet: ActionDefinition<Input> = {
  key: "message-report-get",
  type: "read",
  resource: "message",
  title: "Get Message Report",
  description: "Get the delivery, engagement and link-click report for a sent message.",
  params: [{ key: "id", label: "Message ID", type: "string", required: true }],
  output: [
    { key: "delivery", type: "object", label: "Delivery report" },
    { key: "engagement", type: "object", label: "Engagement report" },
    { key: "links", type: "array", label: "Link report" },
  ],

  async execute(input, ctx) {
    return (await new EzTextingClient(ctx).json(
      `/message-reports/${encodePathSegment(input.id)}`,
    )) ??
      {};
  },
};

export default messageReportGet;
