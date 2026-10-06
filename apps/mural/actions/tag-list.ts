import type { ActionDefinition } from "@w6w/types";
import { encodeId, tags } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `GET /murals/{muralId}/tags` (Mural public API v1). OAuth scope: `murals:read`.
 */
type Input = {
  muralId: string;
};

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List Mural Tags",
  description: "List the tags defined on a mural. Needs the `murals:read` OAuth scope.",
  params: [
    str("muralId", "Mural ID", {
      required: true,
      hint: 'The mural ID, e.g. "ws12345.1608152669000".',
    }),
  ],
  output: [
    { key: "items", type: "array", label: "Tags" },
  ],

  execute(input, ctx) {
    return tags(ctx, "GET", `/murals/${encodeId(input.muralId)}/tags`);
  },
};

export default tagList;
