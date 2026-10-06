import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HospitableClient, listValue } from "../lib/client.ts";

/** `POST /v2/reservations/{uuid}/messages` — Send a message to the guest of a reservation. */
interface Input {
  uuid: string;
  body: string;
  images?: unknown;
  sender_id?: string;
}

const reservationMessageSend: ActionDefinition<Input> = {
  key: "reservation-message-send",
  type: "perform",
  resource: "message",
  title: "Send Reservation Message",
  description:
    "Send a message to the guest of a reservation. Accepted asynchronously (HTTP 202) with a sent_reference_id. Limits: 2 messages per minute per reservation, 50 per 5 minutes. Needs message:write.",
  idempotent: false,
  params: [
    { key: "uuid", label: "Reservation UUID", type: "string", required: true },
    { key: "body", label: "Message", type: "text", required: true },
    {
      key: "images",
      label: "Image URLs",
      type: "text",
      hint: "Optional image URLs, comma or newline separated.",
    },
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
      `/reservations/${encodeId(input.uuid)}/messages`,
      {
        body: compact({
          body: input.body,
          images: listValue(input.images),
          sender_id: input.sender_id,
        }),
      },
    );
  },
};

export default reservationMessageSend;
