import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThanksioClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/recipients/{recipientId}` */
interface Input {
  recipientId: string;
}

const recipientGet: ActionDefinition<Input> = {
  key: "recipient-get",
  type: "read",
  resource: "recipient",
  title: "Get Recipient",
  description: "Get a recipient by ID.",
  params: [idParam("recipientId", "Recipient ID")],
  output: [{ key: "recipient", type: "object", label: "The recipient" }],

  async execute(input, ctx) {
    const recipient = await new ThanksioClient(ctx).call(
      `/recipients/${encodeId(input.recipientId)}`,
    );
    return { recipient };
  },
};

export default recipientGet;
