import type { ActionDefinition } from "@w6w/types";
import { encodeId, LoopClient } from "../lib/client.ts";

/**
 * Close Return.
 *
 * `POST /warehouse/return/{id}/close`. Also closes the return in the commerce provider. A refusal arrives as HTTP 200 with an `errors` body; the client raises it.
 */
interface Input {
  returnId: number;
}

const action: ActionDefinition<Input> = {
  key: "return-close",
  type: "perform",
  resource: "return",
  title: "Close Return",
  description: "Close a return without fulfilling its outcomes (no exchange, no gift card).",
  idempotent: false,
  params: [
    {
      key: "returnId",
      label: "Return ID",
      type: "number",
      required: true,
      hint: "Loop's numeric return id (the `id` of a return from Return List / Get Return).",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "True when Loop accepted the action" },
    { key: "returnId", type: "number", label: "Return ID" },
  ],

  async execute(input, ctx) {
    const res = await new LoopClient(ctx).post(
      `/warehouse/return/${encodeId(input.returnId)}/close`,
    );
    return { success: res === true, returnId: input.returnId };
  },
};

export default action;
