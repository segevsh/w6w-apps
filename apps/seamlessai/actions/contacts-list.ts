import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient, toInt } from "../lib/client.ts";

/** `GET /api/client/v2/contacts` — List Researched Contacts. */
interface Input {
  startDate: string;
  endDate: string;
  page?: number;
  limit?: number;
}

const contactsList: ActionDefinition<Input> = {
  key: "contacts-list",
  type: "read",
  resource: "contact",
  title: "List Researched Contacts",
  description:
    "List contacts your organization has researched inside a date window, newest data included. Page with `page` and `limit`.",
  params: [
    {
      key: "startDate",
      label: "Start date",
      type: "datetime",
      required: true,
      hint: "ISO 8601 start of the lookback window.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "datetime",
      required: true,
      hint: "ISO 8601 end of the lookback window.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Page number, starting at 1.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 500,
      validation: { integer: true, min: 1, max: 500 },
      hint: "Maximum results to return. Values above 500 are capped by the vendor.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Researched contacts" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/contacts", {
      query: compact({
        startDate: need(input.startDate, "Start date"),
        endDate: need(input.endDate, "End date"),
        page: toInt(input.page, "Page"),
        limit: toInt(input.limit, "Limit"),
      }) as Record<string, string | number | boolean>,
    });
  },
};

export default contactsList;
