import type { ActionDefinition } from "@w6w/types";
import { asList, CleverReachClient, optEnum } from "../lib/client.ts";

const ORDERS = ["created ASC", "created DESC", "changed ASC", "changed DESC"] as const;

const action: ActionDefinition = {
  key: "group-list",
  type: "search",
  resource: "group",
  title: "List groups",
  description: "List the account's groups (receiver lists) (`GET /v3/groups`).",
  params: [
    {
      key: "order",
      label: "Order by",
      type: "select",
      hint: "Sort statement. Vendor wording: created or changed, ASC or DESC.",
      options: [
        { value: "created ASC", label: "Created, oldest first" },
        { value: "created DESC", label: "Created, newest first" },
        { value: "changed ASC", label: "Changed, oldest first" },
        { value: "changed DESC", label: "Changed, newest first" },
      ],
    },
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "count", type: "number", label: "Number of records on this page" },
    {
      key: "raw",
      type: "object",
      label: "The body, when CleverReach did not answer with an array",
    },
  ],

  async execute(input, ctx) {
    const order = optEnum(input.order, "order", ORDERS);
    return asList(await new CleverReachClient(ctx).request("/groups", { query: { order } }));
  },
};

export default action;
