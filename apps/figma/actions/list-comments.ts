import type { ActionDefinition } from "@w6w/types";
import { FigmaClient } from "../lib/client.ts";

interface Input {
  fileKey: string;
  asMd?: boolean;
}

/**
 * GET /v1/files/{file_key}/comments — list every comment left on a file.
 * Requires `file_comments:read`.
 */
const listComments: ActionDefinition<Input> = {
  key: "list-comments",
  type: "read",
  resource: "comment",
  title: "List Comments",
  description: "List the comments left on a file.",
  params: [
    { key: "fileKey", label: "File key", type: "string", required: true },
    {
      key: "asMd",
      label: "Return as Markdown",
      type: "boolean",
      default: false,
      hint: "Return comment message bodies as their Markdown equivalents.",
    },
  ],
  output: [
    { key: "comments", type: "array", label: "Comments" },
  ],

  execute(input, ctx) {
    const client = new FigmaClient(ctx);
    return client.request(`/v1/files/${encodeURIComponent(input.fileKey)}/comments`, {
      query: { as_md: input.asMd },
    });
  },
};

export default listComments;
