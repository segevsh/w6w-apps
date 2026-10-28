import type { ActionDefinition } from "@w6w/types";
import { batchUpdate, REVISION_PARAM, singleRequestBody } from "../lib/client.ts";

interface Input {
  presentationId: string;
  slideObjectIds: string[];
  insertionIndex: number;
  requiredRevisionId?: string;
}

/**
 * `updateSlidesPosition` via `presentations.batchUpdate`.
 *
 * Two constraints straight from the schema, both of which produce a 400 rather
 * than a silent no-op when violated, and both of which are surprising enough to
 * be spelled out in the hints:
 *
 *   - the IDs "must be in existing presentation order, without duplicates" —
 *     this moves a *contiguous-in-order* selection, it does not reorder within
 *     the selection;
 *   - `insertionIndex` is "based on the slide arrangement **before** the move
 *     takes place", and must be in `[0, slideCount]` inclusive.
 *
 * Declared **not** idempotent: index semantics are relative to the pre-move
 * arrangement, so a repeat run with the same inputs generally lands somewhere
 * else.
 */
const slideMove: ActionDefinition<Input> = {
  key: "slide-move",
  type: "perform",
  resource: "slide",
  title: "Move Slides",
  description: "Reposition one or more slides within the presentation.",
  idempotent: false,
  params: [
    { key: "presentationId", label: "Presentation ID or URL", type: "string", required: true },
    {
      key: "slideObjectIds",
      label: "Slide Object IDs",
      type: "array",
      item: { type: "string" },
      required: true,
      hint: "Must be listed in their current presentation order, with no duplicates.",
    },
    {
      key: "insertionIndex",
      label: "Insertion Index",
      type: "number",
      required: true,
      hint:
        "Zero-based, and interpreted against the slide order BEFORE the move. Between 0 and the slide count, inclusive.",
      validation: { integer: true, min: 0 },
    },
    REVISION_PARAM,
  ],
  output: [
    { key: "presentationId", type: "string", label: "Presentation ID" },
    { key: "replies", type: "array", label: "Replies — empty; this request returns nothing" },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  execute(input, ctx) {
    if (!Array.isArray(input.slideObjectIds) || input.slideObjectIds.length === 0) {
      throw new Error("`slideObjectIds` must be a non-empty array of slide object IDs");
    }
    if (new Set(input.slideObjectIds).size !== input.slideObjectIds.length) {
      throw new Error("`slideObjectIds` must not contain duplicates");
    }
    return batchUpdate(
      ctx,
      input.presentationId,
      singleRequestBody({
        updateSlidesPosition: {
          slideObjectIds: input.slideObjectIds,
          insertionIndex: input.insertionIndex,
        },
      }, { requiredRevisionId: input.requiredRevisionId }),
    );
  },
};

export default slideMove;
