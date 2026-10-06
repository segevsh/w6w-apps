import type { ActionDefinition } from "@w6w/types";
import { encodeId, list, pick } from "../lib/client.ts";
import { int, multi, str } from "../lib/params.ts";

/**
 * `GET /murals/{muralId}/widgets` (Mural public API v1). OAuth scope: `murals:read`.
 */
type Input = {
  muralId: string;
  type?: string[];
  parentId?: string;
  limit?: number;
  next?: string;
};

const widgetList: ActionDefinition<Input> = {
  key: "widget-list",
  type: "read",
  resource: "widget",
  title: "List Widgets",
  description:
    "List the widgets on a mural, optionally of given types or inside a parent. Needs the `murals:read` OAuth scope.",
  params: [
    str("muralId", "Mural ID", {
      required: true,
      hint: 'The mural ID, e.g. "ws12345.1608152669000".',
    }),
    multi("type", "Types", [
      "areas",
      "arrows",
      "comments",
      "files",
      "sticky notes",
      "texts",
      "icons",
      "images",
      "shapes",
    ]),
    str("parentId", "Parent widget ID"),
    int("limit", "Limit", {
      hint: "Maximum results per page (the vendor rejects values of 100 or more).",
    }),
    str("next", "Next page token", {
      hint: "The `next` token from the previous page. Tokens expire (NEXT_TOKEN_EXPIRED).",
    }),
  ],
  output: [
    { key: "items", type: "array", label: "The page of results" },
    { key: "next", type: "string", label: "Token for the next page, absent on the last page" },
  ],

  execute(input, ctx) {
    return list(ctx, "GET", `/murals/${encodeId(input.muralId)}/widgets`, {
      query: pick(input, ["type", "parentId", "limit", "next"]),
    });
  },
};

export default widgetList;
