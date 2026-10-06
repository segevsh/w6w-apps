import type { ActionDefinition } from "@w6w/types";
import { UscreenClient } from "../lib/client.ts";
import { PAGE, rangeParams } from "../lib/params.ts";

interface Input {
  contentType?: string;
  include?: string;
  from?: string;
  to?: string;
  page?: number;
}

const contentList: ActionDefinition<Input> = {
  key: "content-list",
  type: "search",
  resource: "content",
  title: "List Content",
  description: "List videos, collections and live events.",
  params: [
    {
      "key": "contentType",
      "label": "Content type",
      "type": "select",
      "hint": "Leave empty for all types.",
      "options": [{ "value": "video", "label": "Video" }, {
        "value": "collection",
        "label": "Collection",
      }, { "value": "live_event", "label": "Live event" }],
    },
    {
      "key": "include",
      "label": "Include",
      "type": "select",
      "hint": "Embed related records. Only `author` is available.",
      "options": [{ "value": "author", "label": "Author" }],
    },
    ...rangeParams(),
    PAGE,
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "totalCount", type: "number", label: "Total-Count header (null when absent)" },
    {
      key: "totalCountCapped",
      type: "boolean",
      label: "True when the total was reported as 10000+",
    },
    { key: "page", type: "number", label: "Page returned" },
    { key: "nextPage", type: "number", label: "Next page number, or null on the last page" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  ],

  execute(input, ctx) {
    return new UscreenClient(ctx).list("/contents", {
      "content_type": input.contentType,
      "include": input.include,
      "from": input.from,
      "to": input.to,
      "page": input.page,
    });
  },
};

export default contentList;
