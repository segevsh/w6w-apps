import type { ActionDefinition } from "@w6w/types";
import { payload, ZulipClient } from "../lib/client.ts";

interface Input {
  include_subscribers?: "true" | "false" | "partial";
}

const getSubscriptions: ActionDefinition<Input> = {
  key: "get-subscriptions",
  type: "read",
  resource: "subscription",
  title: "List Subscriptions",
  description:
    "List the channels the connected user is subscribed to (GET /users/me/subscriptions).",
  params: [
    {
      "key": "include_subscribers",
      "label": "Include subscribers",
      "type": "select",
      "hint": "`partial` returns the list only for small channels.",
      "options": [
        {
          "value": "false",
          "label": "false",
        },
        {
          "value": "true",
          "label": "true",
        },
        {
          "value": "partial",
          "label": "partial",
        },
      ],
    },
  ],
  output: [
    {
      "key": "subscriptions",
      "type": "array",
      "label": "Subscribed channels",
    },
  ],

  async execute(input, ctx) {
    const res = await new ZulipClient(ctx).request("GET", "/users/me/subscriptions", {
      query: { include_subscribers: input.include_subscribers },
    });
    return payload(res);
  },
};

export default getSubscriptions;
