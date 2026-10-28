import type { ActionDefinition } from "@w6w/types";
import {
  batchUpdate,
  buildElementProperties,
  type ElementPlacement,
  PLACEMENT_PARAMS,
  REVISION_PARAM,
  singleRequestBody,
} from "../lib/client.ts";

interface Input extends ElementPlacement {
  presentationId: string;
  url: string;
  objectId?: string;
  requiredRevisionId?: string;
}

/**
 * `createImage` via `presentations.batchUpdate`.
 *
 * The URL is fetched **once, by Google, at insertion time** and a copy is
 * stored inside the presentation — the deck does not hot-link, so a URL that
 * later 404s does not break the slide, and a URL Google cannot reach *now* is a
 * 400 rather than an empty frame. Google's constraints, verbatim from the
 * schema: "images must be less than 50 MB in size, can't exceed 25 megapixels,
 * and must be in one of PNG, JPEG, or GIF format", and the URL itself is capped
 * at 2 kB.
 *
 * Size and position are optional; omit them and Google places the image itself.
 * When the aspect ratio of the size you give doesn't match the image's, "the
 * image is scaled and centered with respect to the size in order to maintain
 * the aspect ratio" — it is never stretched.
 */
const imageCreate: ActionDefinition<Input> = {
  key: "image-create",
  type: "perform",
  resource: "element",
  title: "Create Image",
  description: "Insert an image from a public URL onto a slide.",
  idempotent: false,
  params: [
    { key: "presentationId", label: "Presentation ID or URL", type: "string", required: true },
    {
      key: "url",
      label: "Image URL",
      type: "string",
      required: true,
      hint:
        "Publicly reachable PNG, JPEG or GIF under 50 MB and 25 megapixels; the URL itself must be under 2 kB.",
    },
    ...PLACEMENT_PARAMS,
    {
      key: "objectId",
      label: "Image Object ID",
      type: "string",
      advanced: true,
      hint: "Optional user-supplied ID for the new image. Must be unique across the presentation.",
    },
    REVISION_PARAM,
  ],
  output: [
    { key: "presentationId", type: "string", label: "Presentation ID" },
    { key: "replies", type: "array", label: "Replies — `createImage.objectId` of the new image" },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  execute(input, ctx) {
    const request: Record<string, unknown> = {
      url: input.url,
      elementProperties: buildElementProperties(input),
    };
    if (input.objectId) request.objectId = input.objectId;

    return batchUpdate(
      ctx,
      input.presentationId,
      singleRequestBody({ createImage: request }, {
        requiredRevisionId: input.requiredRevisionId,
      }),
    );
  },
};

export default imageCreate;
