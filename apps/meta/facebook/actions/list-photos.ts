import type { ActionDefinition } from "@w6w/types";
import { FacebookClient, type FacebookListResponse } from "../lib/client.ts";

interface Input {
  pageId: string;
  type?: "uploaded" | "tagged";
  limit?: number;
  cursor?: string;
}

interface PhotoSummary {
  id: string;
  name?: string;
  created_time?: string;
  link?: string;
}

/**
 * List a Page's photos — `GET /{page-id}/photos`. `type=uploaded` (the
 * default) is photos the Page itself posted; `type=tagged` is photos the
 * Page was tagged in.
 */
const listPhotos: ActionDefinition<Input, FacebookListResponse<PhotoSummary>> = {
  key: "list-photos",
  type: "read",
  resource: "photo",
  title: "List Photos",
  description: "List a Page's photos.",
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "uploaded",
      options: [
        { value: "uploaded", label: "Uploaded by the Page" },
        { value: "tagged", label: "Tagged" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 25 },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "Facebook `after` cursor for pagination.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Photos" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  execute(input, ctx) {
    const client = new FacebookClient(ctx);
    return client.request<FacebookListResponse<PhotoSummary>>(`/${input.pageId}/photos`, {
      params: {
        fields: "id,name,created_time,link",
        type: input.type ?? "uploaded",
        limit: input.limit ?? 25,
        after: input.cursor,
      },
    });
  },
};

export default listPhotos;
