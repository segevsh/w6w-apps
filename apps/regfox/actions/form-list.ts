import type { ActionDefinition } from "@w6w/types";
import { type QueryValue, RegfoxClient } from "../lib/client.ts";
import {
  intParam,
  limitParam,
  PRODUCTS,
  sortParam,
  startingAfterParam,
  tsParam,
} from "../lib/params.ts";

/** `GET /v2/public/forms` — the product is optional here, unlike the search endpoints. */
const formList: ActionDefinition<Record<string, unknown>> = {
  key: "form-list",
  type: "search",
  resource: "form",
  title: "List Forms",
  description: "List registration forms, optionally for one Webconnex product, with their " +
    "status and dates. Statuses: open, closed, scheduled, archived, deleted.",
  params: [
    {
      key: "product",
      label: "Product",
      type: "select",
      options: PRODUCTS.map((p) => ({ value: p, label: p })),
      hint: "Leave empty to list forms across the account's products.",
    },
    { key: "inventory", label: "Include inventory", type: "boolean", default: false },
    sortParam,
    limitParam,
    startingAfterParam,
    intParam("greaterThanId", "Id greater than"),
    intParam("lessThanId", "Id less than"),
    tsParam("dateCreatedAfter", "Created after"),
    tsParam("dateCreatedBefore", "Created before"),
    tsParam("dateUpdatedAfter", "Updated after"),
    tsParam("dateUpdatedBefore", "Updated before"),
    tsParam("datePublishedAfter", "Published after"),
    tsParam("datePublishedBefore", "Published before"),
  ],
  output: [
    { key: "forms", type: "array", label: "Forms" },
    { key: "totalResults", type: "number", label: "Total matches" },
    { key: "hasMore", type: "boolean", label: "More results after this page" },
    { key: "startingAfter", type: "number", label: "Cursor for the next page" },
  ],
  async execute(input, ctx) {
    const query: Record<string, QueryValue> = {};
    for (
      const k of [
        "product",
        "sort",
        "limit",
        "startingAfter",
        "greaterThanId",
        "lessThanId",
        "dateCreatedAfter",
        "dateCreatedBefore",
        "dateUpdatedAfter",
        "dateUpdatedBefore",
        "datePublishedAfter",
        "datePublishedBefore",
      ]
    ) query[k] = input[k] as QueryValue;
    if (input.inventory) query["[]expand"] = "inventory";
    const body = await new RegfoxClient(ctx).call<unknown[]>("/forms", { query });
    return {
      forms: body.data ?? [],
      totalResults: body.totalResults,
      hasMore: body.hasMore ?? false,
      startingAfter: body.startingAfter,
    };
  },
};

export default formList;
