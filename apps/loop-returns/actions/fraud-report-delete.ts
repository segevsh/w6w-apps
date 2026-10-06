import type { ActionDefinition } from "@w6w/types";
import { encodeId, LoopClient } from "../lib/client.ts";

/**
 * Delete Fraud Report.
 *
 * `DELETE /returns/{id}/fraud-report` (Returns scope).
 */
interface Input {
  returnId: number;
}

const action: ActionDefinition<Input> = {
  key: "fraud-report-delete",
  type: "perform",
  resource: "fraud-report",
  title: "Delete Fraud Report",
  description: "Remove the fraud report from a return.",
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
    { key: "success", type: "boolean", label: "True when the report was removed" },
    { key: "returnId", type: "number", label: "Return ID" },
  ],

  async execute(input, ctx) {
    await new LoopClient(ctx).delete(`/returns/${encodeId(input.returnId)}/fraud-report`);
    return { success: true, returnId: input.returnId };
  },
};

export default action;
