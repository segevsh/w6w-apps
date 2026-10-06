import type { ActionDefinition } from "@w6w/types";
import { EzTextingClient } from "../lib/client.ts";
import { pageOutput, paginationParams, sortParam } from "../lib/params.ts";

/** `GET /v1/webhooks/subscriptions` — the account's webhook subscriptions. */
interface Input {
  page?: number;
  size?: string;
  sort?: string;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List webhook subscriptions.",
  params: [...paginationParams(), sortParam()],
  output: pageOutput("Webhook subscriptions"),

  execute(input, ctx) {
    return new EzTextingClient(ctx).page("/webhooks/subscriptions", {
      query: { page: input.page, size: input.size, sort: input.sort },
    });
  },
};

export default webhookList;
