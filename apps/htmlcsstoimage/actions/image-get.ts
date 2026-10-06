import type { ActionDefinition } from "@w6w/types";
import { encodeId, HctiClient } from "../lib/client.ts";

/**
 * `GET /v1/images/{id}` — metadata about one image (not the picture itself).
 *
 * Needs `images:read`. The body's `image_type` discriminator is `html_css`, `url` or
 * `templated`, and the remaining fields follow it: `html`/`css` for the first, `url` for the
 * second, `template_id`/`template_version`/`template_values` for the third. Shared fields
 * include `id`, `created_at`, `metadata` and the viewport/scale options it was made with.
 *
 * Note this is `/v1/images/{id}` (plural) — `/v1/image/{id}` is the render route, which
 * returns image bytes, and `DELETE` on it deletes.
 */
interface Input {
  imageId: string;
}

const imageGet: ActionDefinition<Input> = {
  key: "image-get",
  type: "read",
  resource: "image",
  title: "Get Image",
  description: "Read the metadata of an image: how it was created, its options and timestamps.",
  params: [
    { key: "imageId", label: "Image ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Image ID" },
    { key: "image_type", type: "string", label: "html_css, url or templated" },
    { key: "created_at", type: "string", label: "Created at (UTC)" },
    { key: "metadata", type: "object", label: "Custom metadata" },
  ],

  execute(input, ctx) {
    if (!input.imageId) throw new Error("imageId is required");
    return new HctiClient(ctx).json(`/images/${encodeId(input.imageId)}`);
  },
};

export default imageGet;
