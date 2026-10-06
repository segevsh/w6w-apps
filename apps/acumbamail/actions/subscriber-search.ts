import type { ActionDefinition } from "@w6w/types";
import { call, required } from "../lib/client.ts";

interface Input {
  subscriber: string;
}

/** `POST /api/1/searchSubscriber/` */
const subscriberSearch: ActionDefinition<Input> = {
  key: "subscriber-search",
  type: "search",
  title: "Search Subscriber",
  description:
    "Find a subscriber by email across every list they belong to, with their advanced data (limit: 10 requests per minute).",
  params: [
    {
      key: "subscriber",
      label: "Subscriber email",
      type: "string",
      required: true,
      hint: "Subscriber email address.",
    },
  ],
  output: [{ key: "result", type: "object", label: "Parsed vendor response" }],

  async execute(input, ctx) {
    const result = await call(ctx, "searchSubscriber", {
      subscriber: required("subscriber", input.subscriber),
    });
    return { result };
  },
};

export default subscriberSearch;
