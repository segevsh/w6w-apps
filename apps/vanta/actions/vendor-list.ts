import type { ActionDefinition } from "@w6w/types";
import { csv, query, VantaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/vendors` — the third parties this organisation depends on.
 *
 * Vendor risk is the compliance obligation that grows without anybody deciding
 * to grow it: every tool a team adopts becomes a supplier whose security
 * somebody has to have assessed. Frameworks require the inventory, an
 * assessment per vendor and a review cadence.
 *
 * ## The status filter is what makes this a report rather than a list
 *
 * A vendor inventory is only interesting by state — approved, under review,
 * overdue for reassessment. Listing every vendor answers nothing;
 * `statusMatchesAny` produces the queue.
 *
 * The name filter is a partial, case-insensitive match, which is how a workflow
 * checks whether a newly-discovered SaaS tool is already in the inventory
 * before creating a duplicate.
 */
const action: ActionDefinition = {
  key: "vendor-list",
  type: "read",
  resource: "vendor",
  title: "List vendors",
  description:
    "The third-party inventory frameworks require. Filter by status to get the review queue — " +
    "listing every vendor answers nothing.",
  params: [
    {
      key: "statuses",
      label: "Statuses",
      type: "string",
      default: "",
      hint: "Comma-separated. This is what turns the inventory into a queue.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      default: "",
      hint: "Partial, case-insensitive — how you check whether a tool is already listed before " +
        "adding a duplicate.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "vendors", type: "array", label: "Vendors" },
    { key: "count", type: "number", label: "Vendors returned" },
    { key: "hasNextPage", type: "boolean", label: "True when the walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new VantaClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll(
      "/vendors",
      {
        query: query({ statusMatchesAny: csv(p.statuses), name: p.name }),
      },
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    return { vendors: page.items, count: page.items.length, hasNextPage: page.hasNextPage };
  },
};

export default action;
