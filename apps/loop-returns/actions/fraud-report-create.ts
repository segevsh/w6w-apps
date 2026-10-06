import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, LoopClient } from "../lib/client.ts";

/**
 * Create Fraud Report.
 *
 * `POST /returns/{id}/fraud-report` (Returns scope). Categories are Loop's fixed set.
 */
interface Input {
  returnId: number;
  category?: string;
  comment?: string;
}

const action: ActionDefinition<Input> = {
  key: "fraud-report-create",
  type: "perform",
  resource: "fraud-report",
  title: "Create Fraud Report",
  description: "Report a return as fraudulent, with an optional category and comment.",
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
      key: "category",
      label: "Category",
      type: "select",
      hint: "Why the return is being reported.",
      options: [
        { value: "package-never-received", label: "Package never received" },
        { value: "package-is-empty", label: "Package is empty" },
        { value: "package-is-missing-items", label: "Package is missing items" },
        { value: "instant-return-charge-failed", label: "Instant return charge failed" },
        { value: "keep-item-abuse", label: "Keep-item abuse" },
        {
          value: "splitting-returns-to-avoid-restrictions",
          label: "Splitting returns to avoid restrictions",
        },
        { value: "item-is-worn", label: "Item is worn" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "comment",
      label: "Comment",
      type: "string",
      hint: "Free-text detail.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Fraud report ID" },
    { key: "return_id", type: "number", label: "Return ID" },
    { key: "category", type: "string", label: "Category" },
    { key: "comment", type: "string", label: "Comment" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    return new LoopClient(ctx).post(
      `/returns/${encodeId(input.returnId)}/fraud-report`,
      compact({ category: input.category, comment: input.comment }),
    );
  },
};

export default action;
