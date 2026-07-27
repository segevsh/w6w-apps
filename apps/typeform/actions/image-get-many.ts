import type { ActionDefinition } from "@w6w/types";
import { TypeformClient } from "../lib/client.ts";

/**
 * GET /images — list the images in the account's library. The collection
 * endpoint takes no paging; it returns every image with its `id` and `src`.
 */
const imageGetMany: ActionDefinition<Record<string, never>> = {
  key: "image-get-many",
  type: "read",
  resource: "image",
  title: "Get Many Images",
  description: "List all images in the account's image library.",
  params: [],
  output: [{ key: "_value", type: "array", label: "Images" }],

  execute(_input, ctx) {
    return new TypeformClient(ctx).request("/images");
  },
};

export default imageGetMany;
