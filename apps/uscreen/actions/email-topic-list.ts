import type { ActionDefinition } from "@w6w/types";
import { UscreenClient } from "../lib/client.ts";
import { PAGE } from "../lib/params.ts";

interface Input {
  page?: number;
}

const emailTopicList: ActionDefinition<Input> = {
  key: "email-topic-list",
  type: "search",
  resource: "email-topic",
  title: "List Email Topics",
  description:
    "List the store's active marketing-email topics (at most 10). Use the ids to unsubscribe customers from specific topics.",
  params: [
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
    return new UscreenClient(ctx).list("/email_topics", { "page": input.page });
  },
};

export default emailTopicList;
