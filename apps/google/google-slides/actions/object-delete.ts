import type { ActionDefinition } from "@w6w/types";
import { batchUpdate, REVISION_PARAM, singleRequestBody } from "../lib/client.ts";

interface Input {
  presentationId: string;
  objectId: string;
  requiredRevisionId?: string;
}

/**
 * `deleteObject` via `presentations.batchUpdate`.
 *
 * The one delete verb in the API — it takes "either pages or page elements",
 * so this is how you remove a slide *and* how you remove a text box. Two
 * documented cascades worth knowing before you run it:
 *
 *   - "if after a delete operation a group contains only 1 or no page elements,
 *     the group is also deleted";
 *   - deleting a placeholder on a *layout* also empties the inheriting
 *     placeholders on every slide built from it.
 *
 * Declared **not** idempotent even though a second delete is harmless in
 * outcome: the second call is a 400 (the object no longer exists), so it is not
 * safe to blind-retry.
 */
const objectDelete: ActionDefinition<Input> = {
  key: "object-delete",
  type: "perform",
  resource: "element",
  title: "Delete Object",
  description: "Delete a slide or a page element by object ID.",
  idempotent: false,
  params: [
    { key: "presentationId", label: "Presentation ID or URL", type: "string", required: true },
    {
      key: "objectId",
      label: "Object ID",
      type: "string",
      required: true,
      hint: "A page (slide/layout/master) object ID, or a page element object ID.",
    },
    REVISION_PARAM,
  ],
  output: [
    { key: "presentationId", type: "string", label: "Presentation ID" },
    { key: "replies", type: "array", label: "Replies — empty; this request returns nothing" },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  execute(input, ctx) {
    return batchUpdate(
      ctx,
      input.presentationId,
      singleRequestBody({ deleteObject: { objectId: input.objectId } }, {
        requiredRevisionId: input.requiredRevisionId,
      }),
    );
  },
};

export default objectDelete;
