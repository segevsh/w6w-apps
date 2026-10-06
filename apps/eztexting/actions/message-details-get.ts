import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, EzTextingClient } from "../lib/client.ts";

/** `GET /v1/message-details/{id}` — recipients, credits used and sender of a sent message. */
interface Input {
  id: string;
}

const messageDetailsGet: ActionDefinition<Input> = {
  key: "message-details-get",
  type: "read",
  resource: "message",
  title: "Get Message Details",
  description: "Get who a sent message went to, its credit cost and its sending number.",
  params: [{ key: "id", label: "Message ID", type: "string", required: true }],
  output: [
    { key: "recipientsCount", type: "number", label: "Recipients" },
    { key: "credits", type: "number", label: "Credits used" },
    { key: "fromNumber", type: "string", label: "From number" },
    { key: "sentOn", type: "string", label: "Sent on" },
    { key: "type", type: "string", label: "SMS or MMS" },
    { key: "groups", type: "array", label: "Groups sent to" },
    { key: "contacts", type: "array", label: "Individual contacts sent to" },
  ],

  async execute(input, ctx) {
    return (await new EzTextingClient(ctx).json(
      `/message-details/${encodePathSegment(input.id)}`,
    )) ??
      {};
  },
};

export default messageDetailsGet;
