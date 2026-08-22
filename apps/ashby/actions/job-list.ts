import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact, csv, epochMillis } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `POST /job.list` — the roles being hired for.
 *
 * ## A Job is not a Job Posting
 *
 * The distinction runs through this whole app. A **job** is the internal role —
 * its hiring team, interview plan, openings and applications. A **job posting**
 * is a public advertisement *for* that job, and one job can have several
 * postings across different boards, or none at all.
 *
 * So "what are we hiring for" is this action, and "what does our careers page
 * show" is `job-posting-list`. Confusing them produces a careers page missing
 * the confidential roles, or an internal report padded with three postings for
 * one job.
 *
 * `status` — `Draft`, `Open`, `Closed`, `Archived` — defaults to nothing here
 * because dashboards want `Open` and audits want everything, and guessing wrong
 * is worse than asking.
 *
 * **Confidential jobs are invisible without the permission.** Ashby leaves
 * that key permission off by default, so a job somebody can see in the UI and
 * the API cannot is usually this, not a bug.
 */
const action: ActionDefinition = {
  key: "job-list",
  type: "read",
  resource: "job",
  title: "List jobs",
  description:
    "The internal roles being hired for — not the public postings. Confidential jobs are hidden " +
    "unless the API key has that permission, which is off by default.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "string",
      default: "Open",
      hint: "`Draft`, `Open`, `Closed` or `Archived`, comma-separated.",
    },
    { key: "openedAfter", label: "Opened After", type: "datetime", default: "" },
    { key: "closedAfter", label: "Closed After", type: "datetime", default: "", advanced: true },
    { key: "createdAfter", label: "Created After", type: "datetime", default: "", advanced: true },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      default: "",
      advanced: true,
      hint: "`openings`, `location`.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "jobs", type: "array", label: "Jobs" },
    { key: "count", type: "number", label: "Jobs returned" },
    { key: "syncToken", type: "string", label: "Store this and pass it next run" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new AshbyClient(ctx);
    const returnAll = p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll(
      "job.list",
      compact({
        syncToken: p.syncToken,
        status: csv(p.status),
        openedAfter: epochMillis(p.openedAfter, "openedAfter"),
        closedAfter: epochMillis(p.closedAfter, "closedAfter"),
        createdAfter: epochMillis(p.createdAfter, "createdAfter"),
        expand: csv(p.expand),
      }),
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    return { jobs: page.items, count: page.items.length, syncToken: page.syncToken };
  },
};

export default action;
