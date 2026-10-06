import type { ActionDefinition } from "@w6w/types";
import { encodeId, KudosityClient } from "../lib/client.ts";

/** `GET /v2/whatsapp/messages/{id}` — status plus the delivery `events` timeline. */
interface Input {
  id: string;
}

const whatsappGet: ActionDefinition<Input> = {
  key: "whatsapp-get",
  type: "read",
  resource: "whatsapp",
  title: "Get WhatsApp Message",
  description: "Retrieve a WhatsApp message with its status and delivery events by id.",
  params: [{ key: "id", label: "Message ID", type: "string", required: true, hint: "A UUID." }],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "sender", type: "string", label: "Sender" },
    { key: "recipient", type: "string", label: "Recipient" },
    { key: "content", type: "object", label: "Content" },
    { key: "events", type: "object", label: "Delivery events" },
  ],

  async execute(input, ctx) {
    const { data } = await new KudosityClient(ctx).data(
      `/whatsapp/messages/${encodeId(input.id)}`,
    );
    return data as Record<string, unknown>;
  },
};

export default whatsappGet;
