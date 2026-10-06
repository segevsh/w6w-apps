import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThanksioClient } from "../lib/client.ts";
import { idParam, recipientBody, recipientFieldParams } from "../lib/params.ts";

/** `PUT /api/v2/recipients/{recipientId}` */
interface Input {
  recipientId: string;
  [key: string]: unknown;
}

const recipientUpdate: ActionDefinition<Input> = {
  key: "recipient-update",
  type: "perform",
  resource: "recipient",
  title: "Update Recipient",
  description: "Update the details of a recipient. Only the fields you give are sent.",
  idempotent: true,
  params: [idParam("recipientId", "Recipient ID"), ...recipientFieldParams],
  output: [{ key: "recipient", type: "object", label: "The updated recipient" }],

  async execute(input, ctx) {
    const body = recipientBody(input);
    if (Object.keys(body).length === 0) throw new Error("Give at least one field to update");
    const recipient = await new ThanksioClient(ctx).call(
      `/recipients/${encodeId(input.recipientId)}`,
      { method: "PUT", body },
    );
    return { recipient };
  },
};

export default recipientUpdate;
