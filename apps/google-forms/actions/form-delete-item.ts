import type { ActionDefinition } from "@w6w/types";
import { batchUpdate, singleRequestBody } from "../lib/client.ts";

interface Input {
  formId: string;
  index: number;
  includeFormInResponse?: boolean;
}

/**
 * `deleteItem` via `forms.batchUpdate`.
 *
 * Addressed by position, not by `itemId` — `DeleteItemRequest` carries only a
 * `Location`. Not idempotent for the same reason as `form-move-item`: running
 * it twice deletes two different items.
 */
const formDeleteItem: ActionDefinition<Input> = {
  key: "form-delete-item",
  type: "perform",
  resource: "item",
  title: "Delete Item",
  description: "Delete the form item at a given index.",
  idempotent: false,
  params: [
    { key: "formId", label: "Form ID or URL", type: "string", required: true },
    {
      key: "index",
      label: "Index",
      type: "number",
      required: true,
      hint: "Zero-based position of the item to delete.",
      validation: { integer: true, min: 0 },
    },
    { key: "includeFormInResponse", label: "Include Form In Response", type: "boolean" },
  ],
  output: [
    { key: "form", type: "object", label: "Updated form (when requested)" },
    { key: "replies", type: "array", label: "One reply per request" },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  execute(input, ctx) {
    return batchUpdate(
      ctx,
      input.formId,
      singleRequestBody(
        { deleteItem: { location: { index: input.index } } },
        { includeFormInResponse: input.includeFormInResponse },
      ),
    );
  },
};

export default formDeleteItem;
