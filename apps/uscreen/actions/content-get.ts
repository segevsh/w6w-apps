import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";

interface Input {
  contentId: string;
  include?: string;
}

const contentGet: ActionDefinition<Input> = {
  key: "content-get",
  type: "read",
  resource: "content",
  title: "Get Content",
  description: "Fetch one video, collection or live event.",
  params: [
    {
      "key": "contentId",
      "label": "Content ID",
      "type": "string",
      "required": true,
      "hint": "A video, collection or live event id.",
    },
    {
      "key": "include",
      "label": "Include",
      "type": "select",
      "hint": "Embed related records. Only `author` is available.",
      "options": [{ "value": "author", "label": "Author" }],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Record id (the full vendor object is returned)" },
  ],

  async execute(input, ctx) {
    return (await new UscreenClient(ctx).call<Record<string, unknown>>(
      "GET",
      `/contents/${seg(input.contentId)}`,
      { query: { "include": input.include } },
    )) ?? {};
  },
};

export default contentGet;
