import type { ActionDefinition } from "@w6w/types";
import { encodeId, LoopClient } from "../lib/client.ts";

/**
 * Cancel Return.
 *
 * `POST /warehouse/return/{id}/cancel`. A refusal arrives as HTTP **200** with `{"errors": {"message": …}}`, not an error status; the client raises it.
 */
interface Input {
  returnId: number;
}

const action: ActionDefinition<Input> = {
  key: "return-cancel",
  type: "perform",
  resource: "return",
  title: "Cancel Return",
  description: "Cancel a return so the customer can return the same items again.",
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
      `/warehouse/return/${encodeId(input.returnId)}/cancel`,
    );
    return { success: res === true, returnId: input.returnId };
  },
};

export default action;
