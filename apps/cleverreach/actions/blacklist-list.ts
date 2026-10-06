import type { ActionDefinition } from "@w6w/types";
import { asList, CleverReachClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "blacklist-list",
  type: "search",
  resource: "blacklist",
  title: "List blacklisted emails",
  description:
    "List every blacklisted email address in the account (`GET /v3/blacklist`). The endpoint documents no paging.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "count", type: "number", label: "Number of records on this page" },
    {
      key: "raw",
      type: "object",
      label: "The body, when CleverReach did not answer with an array",
    },
  ],

  async execute(_input, ctx) {
    return asList(await new CleverReachClient(ctx).request("/blacklist"));
  },
};

export default action;
