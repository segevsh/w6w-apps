import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact, csv, epochMillis } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `POST /application.list` — the pipeline itself.
 *
 * An **application** is one candidate being considered for one job, and it is
 * the record almost every recruiting question is really about: how many people
 * are in play for this role, who has been sitting in a stage for two weeks, how
 * many made it from screen to onsite.
 *
 * ## `status` is the filter that matters
 *
 * `Active`, `Hired`, `Archived`, `Lead` — and the default of *everything* is
 * rarely what anyone means. A "how is this role going" report that forgets to
 * filter counts every rejected candidate since the role opened.
 *
 * `Lead` is the one people miss: a sourced person who has not formally applied.
 * They are in the list and usually should not be in the count.
 *
 * Like the other `.list` endpoints, a `syncToken` from the previous run turns
 * a full pipeline export into just what moved — and arrives only on the last
 * page.
 */
const action: ActionDefinition = {
  key: "application-list",
  type: "read",
  resource: "application",
  title: "List applications",
  description:
    "One candidate considered for one job — the record most recruiting questions are about. " +
    "Filter by status: unfiltered counts every rejection since the role opened.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "string",
      default: "Active",
      placeholder: "Active",
      hint: "`Active`, `Hired`, `Archived` or `Lead`, comma-separated. `Lead` is a sourced " +
        "person who has not applied — usually not what a pipeline count means.",
    },
    { key: "jobId", label: "Job ID", type: "string", default: "" },
    { key: "createdAfter", label: "Created After", type: "datetime", default: "" },
    { key: "createdBefore", label: "Created Before", type: "datetime", default: "" },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      default: "",
      advanced: true,
      hint: "Related objects to include inline, e.g. `applicationFormSubmissions`.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "applications", type: "array", label: "Applications" },
    { key: "count", type: "number", label: "Applications returned" },
    { key: "syncToken", type: "string", label: "Store this and pass it next run" },
    { key: "moreDataAvailable", type: "boolean", label: "The walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new AshbyClient(ctx);
    const returnAll = p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 100));
    // A bare call must not mean "every application ever" — the param's default
    // is applied here too, so an unfiltered run does not count every rejection
    // since the role opened.
    const statuses = csv(p.status === undefined ? "Active" : p.status);

    const page = await client.pageAll(
      "application.list",
      compact({
        syncToken: p.syncToken,
        status: statuses?.length === 1 ? statuses[0] : statuses,
        jobId: p.jobId,
        createdAfter: epochMillis(p.createdAfter, "createdAfter"),
        createdBefore: epochMillis(p.createdBefore, "createdBefore"),
        expand: csv(p.expand),
      }),
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    ctx.log("info", "read Ashby applications", {
      count: page.items.length,
      gotSyncToken: page.syncToken !== undefined,
    });
    return {
      applications: page.items,
      count: page.items.length,
      syncToken: page.syncToken,
      moreDataAvailable: page.moreDataAvailable,
    };
  },
};

export default action;
