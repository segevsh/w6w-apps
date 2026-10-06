import type { ActionDefinition } from "@w6w/types";
import { csv, HyrosClient, pageQuery, quotedList } from "../lib/client.ts";

interface Input {
  [key: string]: unknown;
  fromDate?: string;
  toDate?: string;
  pageSize?: number;
  pageId?: string;
}

const action: ActionDefinition<Input> = {
  key: "subscriptions-list",
  type: "read",
  resource: "subscription",
  title: "List Subscriptions",
  description: "Search recurring subscriptions by id, email, lead, product tag, date or state.",
  params: [
    { key: "ids", label: "IDs", type: "string", hint: "Comma-separated, at most 50." },
    {
      key: "emails",
      label: "Emails",
      type: "string",
      hint: "Comma-separated emails or email prefixes, at most 50.",
    },
    { key: "leadIds", label: "Lead IDs", type: "string", hint: "Comma-separated, at most 50." },
    {
      key: "productTags",
      label: "Product tags",
      type: "string",
      hint: "Comma-separated, at most 20.",
    },
    {
      key: "subscriptionStates",
      label: "States",
      type: "string",
      hint:
        "Comma-separated from ACTIVE, TRIALING, CANCELED, PAST_DUE, INCOMPLETE, INCOMPLETE_EXPIRED, UNPAID, COMPLETED, PAUSED. Empty means all.",
    },
    {
      key: "fromDate",
      label: "From date",
      type: "string",
      hint:
        "ISO 8601, e.g. 2026-01-01T00:00:00-05:00. Without a zone the account timezone applies.",
    },
    {
      key: "toDate",
      label: "To date",
      type: "string",
      hint: "ISO 8601. Only records older than this.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { min: 1, max: 250, integer: true },
      hint: "1-250. Hyros pages with an opaque cursor, returned as nextPageId.",
    },
    {
      key: "pageId",
      label: "Page cursor",
      type: "string",
      hint: "The nextPageId from the previous response. Changing any other filter resets it.",
    },
  ],
  output: [
    { key: "result", type: "array", label: "Matching records" },
    { key: "nextPageId", type: "string", label: "Cursor for the next page, or null" },
  ],

  async execute(input, ctx) {
    const { result, nextPageId } = await new HyrosClient(ctx).read("/subscriptions", {
      ids: quotedList(input.ids),
      emails: quotedList(input.emails),
      fromDate: input.fromDate,
      toDate: input.toDate,
      leadIds: quotedList(input.leadIds),
      productTags: quotedList(input.productTags),
      subscriptionStates: csv(input.subscriptionStates).join(",") || undefined,
      ...pageQuery(input),
    });
    return { result, nextPageId };
  },
};

export default action;
