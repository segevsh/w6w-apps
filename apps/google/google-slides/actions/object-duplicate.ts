import type { ActionDefinition } from "@w6w/types";
import { batchUpdate, REVISION_PARAM, singleRequestBody } from "../lib/client.ts";

interface Input {
  presentationId: string;
  objectId: string;
  objectIds?: Record<string, string>;
  requiredRevisionId?: string;
}

/**
 * `duplicateObject` via `presentations.batchUpdate`.
 *
 * Works on a slide *or* a page element — the schema is one request for both.
 * Placement is fixed by Google, not by you: "when duplicating a slide, the
 * duplicate slide will be created immediately following the specified slide"
 * and "when duplicating a page element, the duplicate will be placed on the
 * same page at the same position as the original". Use `slide-move` afterwards
 * if you need it elsewhere.
 *
 * `objectIds` is a map from *original* child object ID to the ID its copy
 * should get. Duplicating a slide copies every element on it, so without this
 * map every copy gets a fresh random ID and you have to re-read the deck to
 * find anything. Keys not present in the map are given generated IDs; a key
 * that isn't part of the duplicated subtree is a 400.
 */
const objectDuplicate: ActionDefinition<Input> = {
  key: "object-duplicate",
  type: "perform",
  resource: "element",
  title: "Duplicate Object",
  description: "Duplicate a slide or a page element, optionally naming the copies' object IDs.",
  idempotent: false,
  params: [
    { key: "presentationId", label: "Presentation ID or URL", type: "string", required: true },
    {
      key: "objectId",
      label: "Object ID",
      type: "string",
      required: true,
      hint: "The slide or page element to duplicate.",
    },
    {
      key: "objectIds",
      label: "Object ID Map",
      type: "json",
      advanced: true,
      hint:
        'Optional `{ "<original id>": "<id for the copy>" }` map covering the duplicated object and anything inside it. Omitted entries get generated IDs.',
      placeholder: '{"slide1":"slide1_copy","title1":"title1_copy"}',
    },
    REVISION_PARAM,
  ],
  output: [
    { key: "presentationId", type: "string", label: "Presentation ID" },
    {
      key: "replies",
      type: "array",
      label: "Replies — `duplicateObject.objectId` of the top-level copy",
    },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  execute(input, ctx) {
    const request: Record<string, unknown> = { objectId: input.objectId };
    if (input.objectIds && Object.keys(input.objectIds).length > 0) {
      request.objectIds = input.objectIds;
    }
    return batchUpdate(
      ctx,
      input.presentationId,
      singleRequestBody({ duplicateObject: request }, {
        requiredRevisionId: input.requiredRevisionId,
      }),
    );
  },
};

export default objectDuplicate;
