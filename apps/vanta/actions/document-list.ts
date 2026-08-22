import type { ActionDefinition } from "@w6w/types";
import { csv, query, VantaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/documents` — the evidence that is not automated.
 *
 * Most of a compliance program is tests; the rest is documents — a penetration
 * test report, a board minute, a signed vendor agreement, a completed access
 * review. Vanta tracks them because an auditor asks for them and because they
 * expire.
 *
 * ## Status is the field that matters, and "missing" is a status
 *
 * A document Vanta expects and has never received is not absent from this list
 * — it is present with a status saying so. That is the whole point: a report
 * built by listing what exists misses exactly the evidence nobody has
 * uploaded, which is the evidence that fails an audit.
 *
 * So `statusMatchesAny` is the filter to build a reminder workflow on, and this
 * action returns the status counts alongside the list rather than making a
 * caller tally them.
 */
const action: ActionDefinition = {
  key: "document-list",
  type: "read",
  resource: "document",
  title: "List documents",
  description:
    "The evidence that is not automated — reports, minutes, signed agreements. A document Vanta " +
    "expects and has never received is IN this list with a status, not missing from it.",
  params: [
    {
      key: "statuses",
      label: "Statuses",
      type: "string",
      default: "",
      hint: "Comma-separated. The filter a reminder workflow is built on.",
    },
    {
      key: "frameworks",
      label: "Frameworks",
      type: "string",
      default: "",
      hint: "Comma-separated framework ids.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "documents", type: "array", label: "Documents" },
    { key: "count", type: "number", label: "Documents returned" },
    { key: "statusCounts", type: "object", label: "How many in each status" },
    { key: "hasNextPage", type: "boolean", label: "True when the walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new VantaClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll<{ status?: string }>(
      "/documents",
      {
        query: query({
          statusMatchesAny: csv(p.statuses),
          frameworkMatchesAny: csv(p.frameworks),
        }),
      },
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    const statusCounts: Record<string, number> = {};
    for (const doc of page.items) {
      const status = String(doc?.status ?? "unknown");
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }

    return {
      documents: page.items,
      count: page.items.length,
      statusCounts,
      hasNextPage: page.hasNextPage,
    };
  },
};

export default action;
