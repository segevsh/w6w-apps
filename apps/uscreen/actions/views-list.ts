import type { ActionDefinition } from "@w6w/types";
import { UscreenClient } from "../lib/client.ts";
import { PAGE, PER_PAGE, rangeParams } from "../lib/params.ts";

interface Input {
  userId?: string;
  contentId?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}

const viewsList: ActionDefinition<Input> = {
  key: "views-list",
  type: "search",
  resource: "analytics",
  title: "List Video Views",
  description:
    "List individual video views, optionally for one customer or one video, collection or live event. Defaults to the last 12 months.",
  params: [
    {
      "key": "userId",
      "label": "User ID or email",
      "type": "string",
      "hint": "Filter to one customer (id or email).",
    },
    {
      "key": "contentId",
      "label": "Content ID",
      "type": "string",
      "hint": "Filter to one video, collection or live event.",
    },
    ...rangeParams(" Must be within the last 12 months. Default: 12 months ago."),
    PAGE,
    PER_PAGE,
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
    return new UscreenClient(ctx).list("/analytics/videos/views", {
      "user_id": input.userId,
      "content_id": input.contentId,
      "from": input.from,
      "to": input.to,
      "page": input.page,
      "per_page": input.perPage,
    });
  },
};

export default viewsList;
