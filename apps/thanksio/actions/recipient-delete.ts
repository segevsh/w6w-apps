import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThanksioClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /api/v2/recipients/{recipientId}` */
interface Input {
  recipientId: string;
}

const recipientDelete: ActionDefinition<Input> = {
  key: "recipient-delete",
  type: "perform",
  resource: "recipient",
  title: "Delete Recipient",
  description: "Delete a recipient from its mailing list.",
  idempotent: true,
  params: [idParam("recipientId", "Recipient ID")],
  output: [{ key: "result", type: "object", label: "The vendor's response" }],

  async execute(input, ctx) {
    const result = await new ThanksioClient(ctx).call(
      `/recipients/${encodeId(input.recipientId)}`,
      { method: "DELETE" },
    );
    return { result };
  },
};

export default recipientDelete;
