import type { ActionDefinition } from "@w6w/types";
import { FacebookClient } from "../lib/client.ts";

interface Input {
  pageId: string;
  url: string;
  caption?: string;
  published?: boolean;
}

/**
 * Upload a photo to a Page from a publicly-reachable image URL —
 * `POST /{page-id}/photos` with the `url` parameter.
 *
 * Raw binary upload (multipart file attach) is deliberately out of scope: the
 * app sandbox reaches the network only through `ctx.fetch` over a static,
 * publish-time hostname allowlist (`w6w.network.allow`), so it cannot receive
 * or stream an arbitrary local file the way a browser/SDK upload would. The
 * URL form is Graph API's own documented alternative and needs nothing beyond
 * `graph.facebook.com`.
 *
 * Not `idempotent`: a retried call uploads a second copy of the photo.
 */
const uploadPhoto: ActionDefinition<Input, { id: string; post_id?: string }> = {
  key: "upload-photo",
  type: "perform",
  resource: "photo",
  title: "Upload Photo",
  description: "Upload a photo to a Page from an image URL.",
  idempotent: false,
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
    {
      key: "url",
      label: "Image URL",
      type: "string",
      required: true,
      hint: "Must be publicly reachable — Facebook fetches it server-side.",
    },
    { key: "caption", label: "Caption", type: "text" },
    {
      key: "published",
      label: "Published",
      type: "boolean",
      default: true,
      hint: "Set false to upload without creating a feed story.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Photo ID" },
    { key: "post_id", type: "string", label: "Post ID" },
  ],

  execute(input, ctx) {
    const client = new FacebookClient(ctx);
    return client.request<{ id: string; post_id?: string }>(`/${input.pageId}/photos`, {
      method: "POST",
      params: {
        url: input.url,
        caption: input.caption,
        published: input.published ?? true,
      },
    });
  },
};

export default uploadPhoto;
