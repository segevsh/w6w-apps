import type { ActionDefinition } from "@w6w/types";
import { encodeId, HctiClient } from "../lib/client.ts";

/**
 * `DELETE /v1/image/{id}` — delete an image and clear its CDN cache.
 *
 * Needs `images:delete`. Answers `202 Accepted` with no body: the deletion is queued, so a
 * `GET` immediately after may still see the image. The docs say all copies are removed and
 * it cannot be undone. Deleting an unknown id answers `404`, which surfaces as an error.
 */
interface Input {
  imageId: string;
}

const imageDelete: ActionDefinition<Input> = {
  key: "image-delete",
  type: "perform",
  resource: "image",
  title: "Delete Image",
  description: "Permanently delete an image and its cached copies.",
  idempotent: true,
  params: [
    { key: "imageId", label: "Image ID", type: "string", required: true },
  ],
  output: [
    { key: "imageId", type: "string", label: "Image deleted" },
    { key: "status", type: "number", label: "HTTP status — 202 when queued" },
  ],

  async execute(input, ctx) {
    if (!input.imageId) throw new Error("imageId is required");
    const status = await new HctiClient(ctx).status(`/image/${encodeId(input.imageId)}`, {
      method: "DELETE",
    });
    return { imageId: input.imageId, status };
  },
};

export default imageDelete;
