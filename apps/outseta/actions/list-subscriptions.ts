import type { ActionDefinition } from "@w6w/types";
import {
  OutsetaClient,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  status?: string | number;
  current?: boolean;
}

/** `GET /api/v1/billing/subscriptions` — List subscriptions across accounts, optionally only current, future or past ones. */
const listSubscriptions: ActionDefinition<Input> = {
  key: "list-subscriptions",
  type: "search",
  resource: "billing",
  title: "List Subscriptions",
  description: "List subscriptions across accounts, optionally only current, future or past ones.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        {
          value: "current",
          label: "Current",
        },
        {
          value: "future",
          label: "Future",
        },
        {
          value: "past",
          label: "Past",
        },
      ],
    },
    {
      key: "current",
      label: "Latest per account only",
      type: "boolean",
      hint: "Return only the most recent subscription per account, expired or not.",
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/billing/subscriptions`, {
      method: "GET",
      query: {
        ...pageQuery(input),
        status: input.status,
        "current": input.current ? 1 : undefined,
      },
    });
  },
};

export default listSubscriptions;
