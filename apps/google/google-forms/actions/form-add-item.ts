import type { ActionDefinition } from "@w6w/types";
import { batchUpdate, singleRequestBody } from "../lib/client.ts";

interface Input {
  formId: string;
  item: Record<string, unknown>;
  index: number;
  includeFormInResponse?: boolean;
}

/**
 * `createItem` via `forms.batchUpdate`.
 *
 * `Item` is a union: alongside `title`/`description` it carries exactly one of
 * `questionItem`, `questionGroupItem`, `pageBreakItem`, `textItem`,
 * `imageItem`, `videoItem`. That union is deep enough (choice options, grids,
 * grading, media) that flattening it into form fields would either lose most of
 * it or become a second schema to maintain, so the item is taken as JSON and
 * handed to Google verbatim.
 *
 * `location.index` is required and must be in `[0..N)` where N is the current
 * item count — appending means passing the current count.
 */
const formAddItem: ActionDefinition<Input> = {
  key: "form-add-item",
  type: "perform",
  resource: "item",
  title: "Add Item",
  description: "Insert a question, text block, image, video or page break at a given index.",
  idempotent: false,
  params: [
    { key: "formId", label: "Form ID or URL", type: "string", required: true },
    {
      key: "item",
      label: "Item",
      type: "json",
      required: true,
      hint:
        "An Item object: title/description plus exactly one of questionItem, questionGroupItem, pageBreakItem, textItem, imageItem, videoItem.",
      placeholder:
        '{"title":"Your name","questionItem":{"question":{"required":true,"textQuestion":{}}}}',
    },
    {
      key: "index",
      label: "Index",
      type: "number",
      required: true,
      hint: "Zero-based position. Must be within [0..item count]; use the count to append.",
      validation: { integer: true, min: 0 },
    },
    { key: "includeFormInResponse", label: "Include Form In Response", type: "boolean" },
  ],
  output: [
    { key: "form", type: "object", label: "Updated form (when requested)" },
    { key: "replies", type: "array", label: "Replies — `createItem.itemId` / `questionId`" },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  execute(input, ctx) {
    return batchUpdate(
      ctx,
      input.formId,
      singleRequestBody(
        { createItem: { item: input.item, location: { index: input.index } } },
        { includeFormInResponse: input.includeFormInResponse },
      ),
    );
  },
};

export default formAddItem;
