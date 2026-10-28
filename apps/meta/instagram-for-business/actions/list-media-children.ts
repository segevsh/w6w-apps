import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, type InstagramListResponse, seg } from "../lib/client.ts";

interface Input {
  mediaId: string;
  fields?: string;
}

// `permalink` is deliberately absent: the reference says it cannot be read on photos in albums.
const DEFAULT_FIELDS = "id,media_type,media_url,thumbnail_url,timestamp";

/** List the items of a carousel album — `GET /{ig-media-id}/children`. */
const listMediaChildren: ActionDefinition<Input, InstagramListResponse<Record<string, unknown>>> = {
  key: "list-media-children",
  type: "read",
  resource: "media",
  title: "List Carousel Items",
  description: "List the images and videos inside a carousel post.",
  params: [
    { key: "mediaId", label: "Carousel Media ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: DEFAULT_FIELDS,
      hint: "Comma-separated IG Media fields. `permalink` is not available on carousel items.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Carousel items" }],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<InstagramListResponse<Record<string, unknown>>>(
      `/${seg(input.mediaId)}/children`,
      { params: { fields: input.fields || DEFAULT_FIELDS } },
    );
  },
};

export default listMediaChildren;
