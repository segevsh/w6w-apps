import type { ActionDefinition } from "@w6w/types";
import { encodeId, LoopClient } from "../lib/client.ts";

/**
 * Generate Return Label.
 *
 * `POST /returns/{returnId}/labels` (Returns scope). Answers HTTP 202: the label is generated asynchronously; watch the `label.created` webhook.
 */
interface Input {
  returnId: number;
}

const action: ActionDefinition<Input> = {
  key: "return-label-generate",
  type: "perform",
  resource: "return",
  title: "Generate Return Label",
  description: "Ask Loop to generate a shipping label for a return.",
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
    { key: "message", type: "string", label: "Loop's acknowledgement" },
    { key: "returnId", type: "number", label: "Return ID" },
  ],

  async execute(input, ctx) {
    const res = await new LoopClient(ctx).post(
      `/returns/${encodeId(input.returnId)}/labels`,
    ) as Record<string, unknown>;
    return { message: res?.message, returnId: res?.returnId ?? input.returnId };
  },
};

export default action;
