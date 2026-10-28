import type { ActionDefinition } from "@w6w/types";
import { FacebookClient } from "../lib/client.ts";

interface Input {
  pageId: string;
  fields?: string;
}

interface PageDetail {
  id: string;
  name: string;
  about?: string;
  category?: string;
  fan_count?: number;
  link?: string;
  website?: string;
  picture?: unknown;
}

/**
 * Fetch a Facebook Page's own profile — `GET /{page-id}`.
 */
const getPage: ActionDefinition<Input, PageDetail> = {
  key: "get-page",
  type: "read",
  resource: "page",
  title: "Get Page",
  description: "Fetch a Facebook Page's profile fields.",
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "id,name,about,category,fan_count,link,website,picture",
      hint: "Comma-separated Graph API field list.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Page ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    const client = new FacebookClient(ctx);
    return client.request<PageDetail>(`/${input.pageId}`, {
      params: {
        fields: input.fields || "id,name,about,category,fan_count,link,website,picture",
      },
    });
  },
};

export default getPage;
