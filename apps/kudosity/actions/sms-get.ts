import type { ActionDefinition } from "@w6w/types";
import { encodeId, KudosityClient } from "../lib/client.ts";

/** `GET /v2/sms/{id}` — one SMS by the id returned when it was sent. */
interface Input {
  id: string;
}

const smsGet: ActionDefinition<Input> = {
  key: "sms-get",
  type: "read",
  resource: "sms",
  title: "Get SMS",
  description: "Retrieve an SMS message and its delivery status by id.",
  params: [
    { key: "id", label: "Message ID", type: "string", required: true, hint: "A UUID." },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "direction", type: "string", label: "Direction (IN/OUT)" },
    { key: "recipient", type: "string", label: "Recipient" },
    { key: "sender", type: "string", label: "Sender" },
    { key: "message", type: "string", label: "Message" },
    { key: "sms_count", type: "string", label: "SMS parts" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    return await new KudosityClient(ctx).json(`/sms/${encodeId(input.id)}`);
  },
};

export default smsGet;
