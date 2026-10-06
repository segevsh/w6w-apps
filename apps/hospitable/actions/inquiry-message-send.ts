import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HospitableClient } from "../lib/client.ts";

/** `POST /v2/inquiries/{uuid}/messages` — Reply to a pre-booking inquiry. */
interface Input {
  uuid: string;
  body: string;
  sender_id?: string;
}

const inquiryMessageSend: ActionDefinition<Input> = {
  key: "inquiry-message-send",
  type: "perform",
  resource: "message",
  title: "Send Inquiry Message",
  description:
    "Reply to a pre-booking inquiry using its conversation UUID. Accepted asynchronously (HTTP 202) with a sent_reference_id. Limits: 2 messages per minute per inquiry, 50 per 5 minutes. Needs message:write.",
  idempotent: false,
  params: [
    { key: "uuid", label: "Conversation UUID", type: "string", required: true },
    { key: "body", label: "Message", type: "text", required: true },
    {
      key: "sender_id",
      label: "Sender ID",
      type: "string",
      hint: "Optional id of the teammate to send as.",
    },
  ],
  output: [{ key: "data", type: "object", label: "{ sent_reference_id }" }],

  execute(input, ctx) {
    return new HospitableClient(ctx).request(
      "POST",
      `/inquiries/${encodeId(input.uuid)}/messages`,
      {
        body: compact({ body: input.body, sender_id: input.sender_id }),
      },
    );
  },
};

export default inquiryMessageSend;
