import type { ActionDefinition } from "@w6w/types";
import { batchUpdate, singleRequestBody } from "../lib/client.ts";

interface Input {
  formId: string;
  originalIndex: number;
  newIndex: number;
  includeFormInResponse?: boolean;
}

/**
 * `moveItem` via `forms.batchUpdate`.
 *
 * Both ends are `Location` objects, whose only field is `index`. Not marked
 * idempotent: a repeat of "move index 3 to index 0" moves a *different* item
 * the second time, because the first move renumbered everything.
 */
const formMoveItem: ActionDefinition<Input> = {
  key: "form-move-item",
  type: "perform",
  resource: "item",
  title: "Move Item",
  description: "Move a form item from one position to another.",
  idempotent: false,
  params: [
    { key: "formId", label: "Form ID or URL", type: "string", required: true },
    {
      key: "originalIndex",
      label: "From Index",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
    },
    {
      key: "newIndex",
      label: "To Index",
      type: "number",
      required: true,
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
        {
          moveItem: {
            originalLocation: { index: input.originalIndex },
            newLocation: { index: input.newIndex },
          },
        },
        { includeFormInResponse: input.includeFormInResponse },
      ),
    );
  },
};

export default formMoveItem;
