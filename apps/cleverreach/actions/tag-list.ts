import type { ActionDefinition } from "@w6w/types";
import { asList, CleverReachClient, optEnum, optInt, optString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List tags",
  description: "List the tags used in the account (`GET /v3/tags`).",
  params: [
    { key: "groupId", label: "Group ID", type: "string", hint: "Only tags in this group." },
    {
      key: "origin",
      label: "Origin",
      type: "string",
      hint: "Leave empty for tags without an origin; `*` for any origin.",
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [{ value: "tag", label: "Tag" }, { value: "origin", label: "Origin" }, {
        value: "count",
        label: "Count",
      }],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Vendor default 20.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "The vendor page or offset.",
      validation: { integer: true, min: 0 },
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
    return asList(
      await new CleverReachClient(ctx).request("/tags", {
        query: {
          group_id: optString(input.groupId),
          origin: optString(input.origin),
          order_by: optEnum(input.orderBy, "orderBy", ["tag", "origin", "count"] as const),
          limit: optInt(input.limit, "limit", 1, Number.MAX_SAFE_INTEGER),
          page: optInt(input.page, "page", 0, Number.MAX_SAFE_INTEGER),
        },
      }),
    );
  },
};

export default action;
