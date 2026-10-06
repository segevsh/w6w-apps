import type { ActionDefinition } from "@w6w/types";
import { encodeId, LoopClient } from "../lib/client.ts";

/**
 * Flag Return.
 *
 * `POST /warehouse/return/{id}/flag`. A refusal arrives as HTTP 200 with an `errors` body; the client raises it.
 */
interface Input {
  returnId: number;
}

const action: ActionDefinition<Input> = {
  key: "return-flag",
  type: "perform",
  resource: "return",
  title: "Flag Return",
  description: "Flag a return for human review, which stops automated processing.",
  idempotent: true,
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
      `/warehouse/return/${encodeId(input.returnId)}/flag`,
    );
    return { success: res === true, returnId: input.returnId };
  },
};

export default action;
