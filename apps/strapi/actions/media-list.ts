import type { ActionDefinition } from "@w6w/types";
import { StrapiClient } from "../lib/client.ts";

interface Input {
  page?: number;
  pageSize?: number;
}

/**
 * `GET /api/upload/files/page` — the Upload plugin's paginated Media Library
 * listing, confirmed against Strapi's own REST API docs
 * (docs.strapi.io/cms/api/rest/upload). Deliberately not `/api/upload/files`
 * (also documented, but returns every file as a flat, unpaginated array —
 * the docs themselves recommend `/page` "for any non-trivial Media Library").
 */
const mediaList: ActionDefinition<Input> = {
  key: "media-list",
  type: "read",
  resource: "media",
  title: "List Media Files",
  description: "List files in the Media Library, paginated.",
  params: [
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "pageSize", label: "Page size", type: "number", default: 25 },
  ],
  output: [
    { key: "results", type: "array", label: "Files" },
    { key: "pagination", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    const client = StrapiClient.fromConnection(ctx);
    return client.request(`/api/upload/files/page`, {
      query: { pagination: { page: input.page, pageSize: input.pageSize } },
    });
  },
};

export default mediaList;
