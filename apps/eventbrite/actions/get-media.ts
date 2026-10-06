import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  mediaId: string;
  width?: number;
  height?: number;
}

const getMedia: ActionDefinition<Input> = {
  key: "get-media",
  type: "read",
  resource: "media",
  title: "Get Media",
  description: "Retrieve an uploaded media image by ID, optionally as a thumbnail of a given size.",
  idempotent: true,
  params: [
    { key: "mediaId", label: "Media ID", type: "string", required: true },
    { key: "width", label: "Thumbnail width", type: "number" },
    { key: "height", label: "Thumbnail height", type: "number" },
  ],
  output: [
    { key: "id", type: "string", label: "Image ID" },
    { key: "url", type: "string", label: "Image URL" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/media/${encodeURIComponent(input.mediaId)}/`, {
      query: { width: input.width, height: input.height },
    });
  },
};

export default getMedia;
