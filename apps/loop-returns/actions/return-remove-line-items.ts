import type { ActionDefinition } from "@w6w/types";
import { encodeId, LoopClient, splitList } from "../lib/client.ts";

/**
 * Remove Return Line Items.
 *
 * `POST /warehouse/return/{id}/remove?line_item_id=a,b`. On a refund return pass EVERY line item id in one call — removing them one at a time fails because the first request closes the return. Removing every remaining item cancels the return.
 */
interface Input {
  returnId: number;
  lineItemIds: string;
}

const action: ActionDefinition<Input> = {
  key: "return-remove-line-items",
  type: "perform",
  resource: "return",
  title: "Remove Return Line Items",
  description: "Remove line items from an open refund or store-credit return.",
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
    {
      key: "lineItemIds",
      label: "Line item IDs",
      type: "string",
      required: true,
      hint: "The `line_item_id` values from the return's `line_items`, comma-separated.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "True when Loop accepted the removal" },
    { key: "returnId", type: "number", label: "Return ID" },
  ],

  async execute(input, ctx) {
    const ids = (splitList(input.lineItemIds) ?? []).join(",");
    if (!ids) throw new Error("lineItemIds is required.");
    const res = await new LoopClient(ctx).post(
      `/warehouse/return/${encodeId(input.returnId)}/remove`,
      undefined,
      { line_item_id: ids },
    );
    return { success: res === true, returnId: input.returnId };
  },
};

export default action;
