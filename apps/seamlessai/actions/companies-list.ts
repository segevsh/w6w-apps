import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient, toInt } from "../lib/client.ts";

/** `GET /api/client/v2/companies` — List Researched Companies. */
interface Input {
  startDate: string;
  endDate: string;
  page?: number;
  limit?: number;
}

const companiesList: ActionDefinition<Input> = {
  key: "companies-list",
  type: "read",
  resource: "company",
  title: "List Researched Companies",
  description:
    "List companies your organization has researched inside a date window. Page with `page` and `limit`.",
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
    { key: "data", type: "array", label: "Researched companies" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request("GET", "/companies", {
      query: compact({
        startDate: need(input.startDate, "Start date"),
        endDate: need(input.endDate, "End date"),
        page: toInt(input.page, "Page"),
        limit: toInt(input.limit, "Limit"),
      }) as Record<string, string | number | boolean>,
    });
  },
};

export default companiesList;
