import type { ActionDefinition } from "@w6w/types";
import { batchUpdate, REVISION_PARAM, singleRequestBody } from "../lib/client.ts";

interface Input {
  presentationId: string;
  objectId: string;
  altTitle?: string;
  altDescription?: string;
  requiredRevisionId?: string;
}

/**
 * `updatePageElementAltText` via `presentations.batchUpdate`.
 *
 * The accessibility verb: sets the alt text title and description "exposed to
 * screen readers and other accessibility interfaces". Included as a per-verb
 * action despite being niche because it is the one `update*` request in the
 * whole union with no `fields` mask and no nested style object — its inputs are
 * two strings, so there is nothing to lose by flattening it.
 *
 * "If unset the existing value will be maintained" — so omitting a field leaves
 * it alone rather than clearing it. To *clear* one, send an empty string.
 * Because of that, sending neither would be a no-op and is rejected here.
 *
 * Idempotent: setting the same alt text twice converges on the same state.
 */
const elementAltTextUpdate: ActionDefinition<Input> = {
  key: "element-alt-text-update",
  type: "perform",
  resource: "element",
  title: "Update Alt Text",
  description: "Set the alt text title and/or description of a page element, for screen readers.",
  idempotent: true,
  params: [
    { key: "presentationId", label: "Presentation ID or URL", type: "string", required: true },
    {
      key: "objectId",
      label: "Page Element Object ID",
      type: "string",
      required: true,
      hint: "The image, shape, table, video or group to describe.",
    },
    {
      key: "altTitle",
      label: "Alt Text Title",
      type: "string",
      hint: "Omit to leave the current title untouched; send an empty string to clear it.",
    },
    {
      key: "altDescription",
      label: "Alt Text Description",
      type: "text",
      hint: "Omit to leave the current description untouched; send an empty string to clear it.",
    },
    REVISION_PARAM,
  ],
  output: [
    { key: "presentationId", type: "string", label: "Presentation ID" },
    { key: "replies", type: "array", label: "Replies — empty; this request returns nothing" },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  execute(input, ctx) {
    if (input.altTitle === undefined && input.altDescription === undefined) {
      throw new Error("supply `altTitle`, `altDescription`, or both — an omitted field is a no-op");
    }
    const request: Record<string, unknown> = { objectId: input.objectId };
    if (input.altTitle !== undefined) request.title = input.altTitle;
    if (input.altDescription !== undefined) request.description = input.altDescription;

    return batchUpdate(
      ctx,
      input.presentationId,
      singleRequestBody({ updatePageElementAltText: request }, {
        requiredRevisionId: input.requiredRevisionId,
      }),
    );
  },
};

export default elementAltTextUpdate;
