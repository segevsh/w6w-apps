import type { ActionDefinition } from "@w6w/types";
import {
  batchUpdate,
  buildMatchCriteria,
  REVISION_PARAM,
  singleRequestBody,
} from "../lib/client.ts";

interface Input {
  presentationId: string;
  containsText: string;
  imageUrl: string;
  matchCase?: boolean;
  imageReplaceMethod?: "CENTER_INSIDE" | "CENTER_CROP";
  pageObjectIds?: string[];
  failIfNoMatch?: boolean;
  requiredRevisionId?: string;
}

interface BatchReply {
  replies?: Array<{ replaceAllShapesWithImage?: { occurrencesChanged?: number } }>;
}

/**
 * `replaceAllShapesWithImage` via `presentations.batchUpdate` — the image half
 * of templating: find every placeholder shape containing a marker string and
 * swap it for a picture.
 *
 * Same 2xx-means-nothing hazard as `text-replace-all`, handled the same way:
 * `occurrencesChanged` is normalised and lifted, and `failIfNoMatch` can turn a
 * zero-match run into an error. See that action's comment for why an unmatched
 * run comes back as an empty reply object rather than an explicit zero.
 *
 * Two schema notes:
 *   - `replaceMethod` is **deprecated** in favour of `imageReplaceMethod`, and
 *     the newer field wins if both are sent. Only the newer one is exposed.
 *   - "the images replacing the shapes are rectangular after being inserted and
 *     do not take on the forms of the shapes" — replacing a star with a photo
 *     gives you a rectangular photo.
 *
 * The image URL is fetched **once, by Google, at insertion time** and must be
 * publicly reachable; it must be PNG/JPEG/GIF, under 50 MB and under 25
 * megapixels. A URL Google cannot fetch is a 400, not a silent skip.
 */
const shapesReplaceWithImage: ActionDefinition<Input> = {
  key: "shapes-replace-with-image",
  type: "perform",
  resource: "element",
  title: "Replace Shapes With Image",
  description:
    "Swap every shape containing a marker string for an image, reporting how many shapes changed.",
  idempotent: false,
  params: [
    { key: "presentationId", label: "Presentation ID or URL", type: "string", required: true },
    {
      key: "containsText",
      label: "Shapes Containing Text",
      type: "string",
      required: true,
      hint: "Every shape whose text contains this string is replaced.",
    },
    {
      key: "imageUrl",
      label: "Image URL",
      type: "string",
      required: true,
      hint:
        "Publicly reachable PNG, JPEG or GIF under 50 MB and 25 megapixels. Google fetches it once, at insertion time, and stores a copy.",
    },
    { key: "matchCase", label: "Match Case", type: "boolean", default: false },
    {
      key: "imageReplaceMethod",
      label: "Image Replace Method",
      type: "select",
      options: [
        { value: "CENTER_INSIDE", label: "Center inside — scale to fit, keeping the whole image" },
        { value: "CENTER_CROP", label: "Center crop — fill the shape, cropping the overflow" },
      ],
      hint: "Replaces the deprecated `replaceMethod` field, which is not exposed here.",
    },
    {
      key: "pageObjectIds",
      label: "Limit To Page Object IDs",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "Optional. A notes page/master ID, or an ID not in this presentation, is a 400.",
    },
    {
      key: "failIfNoMatch",
      label: "Fail If Nothing Matched",
      type: "boolean",
      default: false,
      advanced: true,
      hint:
        "Google answers 200 even when no shape matched. Turn this on to raise an error instead.",
    },
    REVISION_PARAM,
  ],
  output: [
    {
      key: "occurrencesChanged",
      type: "number",
      label: "Shapes replaced — 0 means nothing matched",
    },
    { key: "presentationId", type: "string", label: "Presentation ID" },
    { key: "replies", type: "array", label: "Raw replies" },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  async execute(input, ctx) {
    const request: Record<string, unknown> = {
      imageUrl: input.imageUrl,
      containsText: buildMatchCriteria(input.containsText, input.matchCase),
    };
    if (input.imageReplaceMethod) request.imageReplaceMethod = input.imageReplaceMethod;
    if (input.pageObjectIds?.length) request.pageObjectIds = input.pageObjectIds;

    const result = await batchUpdate<BatchReply & Record<string, unknown>>(
      ctx,
      input.presentationId,
      singleRequestBody({ replaceAllShapesWithImage: request }, {
        requiredRevisionId: input.requiredRevisionId,
      }),
    );

    const occurrencesChanged =
      result?.replies?.[0]?.replaceAllShapesWithImage?.occurrencesChanged ?? 0;
    if (occurrencesChanged === 0 && input.failIfNoMatch) {
      throw new Error(
        "replaceAllShapesWithImage matched nothing: 0 shapes changed (the API still returned 200)",
      );
    }
    return { ...result, occurrencesChanged };
  },
};

export default shapesReplaceWithImage;
