import type { ActionDefinition } from "@w6w/types";
import { HctiClient } from "../lib/client.ts";

/**
 * `GET /v1/images` — page through the account's created images, newest first as served.
 *
 * Needs `images:read`. Cursor pagination: pass the previous `next_page_token` as
 * `page_token`; `has_next_page` says whether another page exists. `count` is 1–50
 * (default 50). Each item is only `{id, url, created_at}` — read `image-get` for details.
 */
interface Input {
  count?: number;
  page_token?: string;
}

const imageList: ActionDefinition<Input> = {
  key: "image-list",
  type: "read",
  resource: "image",
  title: "List Images",
  description: "List created images, 50 per page, with a continuation token.",
  params: [
    {
      key: "count",
      label: "Page size",
      type: "number",
      hint: "1–50. Default 50.",
      validation: { min: 1, max: 50, integer: true },
    },
    {
      key: "page_token",
      label: "Page token",
      type: "string",
      hint: "`next_page_token` from the previous page.",
    },
  ],
  output: [
    { key: "images", type: "array", label: "{id, url, created_at} per image" },
    { key: "next_page_token", type: "string", label: "Token for the next page" },
    { key: "has_next_page", type: "boolean", label: "Another page exists" },
  ],

  execute(input, ctx) {
    return new HctiClient(ctx).json("/images", {
      query: {
        count: input.count === undefined || input.count === null ? undefined : Number(input.count),
        page_token: input.page_token,
      },
    });
  },
};

export default imageList;
