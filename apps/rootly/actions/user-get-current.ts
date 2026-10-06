import type { ActionDefinition } from "@w6w/types";
import { itemResult, RootlyClient } from "../lib/client.ts";

/** `GET /v1/users/me` */
const userGetCurrent: ActionDefinition = {
  key: "user-get-current",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Fetch the user the API token belongs to.",
  params: [],
  output: [
    {
      key: "item",
      type: "object",
      label: "The record, flattened to its attributes plus `id` and `type`",
    },
    { key: "included", type: "array", label: "Side-loaded related records (same flattened shape)" },
  ],

  async execute(_input, ctx) {
    const res = await new RootlyClient(ctx).request("GET", "/v1/users/me");
    return itemResult(res);
  },
};

export default userGetCurrent;
