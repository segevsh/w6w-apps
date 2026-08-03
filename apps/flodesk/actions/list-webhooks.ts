import type { ActionDefinition } from "@w6w/types";
import {
  FlodeskClient,
  type FlodeskList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

type Input = PageInput;

const listWebhooks: ActionDefinition<Input> = {
  key: "list-webhooks",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description:
    "List webhook subscriptions one page at a time. Each carries `id`, `post_url`, `events` and `created_at`. Returns `{ meta, data }`.",
  params: [...PAGE_PARAMS],
  output: [
    { key: "data", type: "array", label: "Webhooks" },
    ...PAGE_OUTPUT,
  ],

  execute(input, ctx) {
    return new FlodeskClient(ctx).request<FlodeskList>("/webhooks", {
      query: pageQuery(input),
    });
  },
};

export default listWebhooks;
