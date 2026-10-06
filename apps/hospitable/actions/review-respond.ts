import type { ActionDefinition } from "@w6w/types";
import { encodeId, HospitableClient } from "../lib/client.ts";

/** `POST /v2/reviews/{uuid}/respond` — Publish the host's public response to a guest review. */
interface Input {
  uuid: string;
  response: string;
}

const reviewRespond: ActionDefinition<Input> = {
  key: "review-respond",
  type: "perform",
  resource: "review",
  title: "Respond to Review",
  description:
    "Publish the host's response to a guest review. Currently supported for Airbnb and Booking.com reviews. Needs reviews:write.",
  idempotent: false,
  params: [
    {
      key: "uuid",
      label: "Review UUID",
      type: "string",
      required: true,
      hint: "The review's id, from List Property Reviews.",
    },
    { key: "response", label: "Response", type: "text", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Review id" },
    { key: "public", type: "object", label: "Public rating, review text and the host response" },
    { key: "responded_at", type: "string", label: "When the response was recorded" },
  ],

  execute(input, ctx) {
    return new HospitableClient(ctx).request("POST", `/reviews/${encodeId(input.uuid)}/respond`, {
      body: { response: input.response },
    });
  },
};

export default reviewRespond;
