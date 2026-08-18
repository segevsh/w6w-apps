import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `POST /department.list` — the departments jobs are filed under.
 *
 * Needed for two things: filtering `job-posting-list`, which matches on the
 * department **name** case-sensitively, and grouping any pipeline report by
 * team.
 *
 * Departments are hierarchical in Ashby — a department can sit under another —
 * so a report that groups on the immediate department and expects "Engineering"
 * gets "Platform" and "Mobile" separately.
 *
 * Archived departments are excluded by default. They still appear on historical
 * jobs, so resolving an old job's department needs them included.
 */
const action: ActionDefinition = {
  key: "department-list",
  type: "read",
  resource: "department",
  title: "List departments",
  description:
    "Departments, for grouping and for the case-sensitive name filter on job postings. They are " +
    "hierarchical, so grouping on the immediate department splits a division into its teams.",
  params: [
    {
      key: "includeArchived",
      label: "Include Archived",
      type: "boolean",
      default: false,
      hint: "Archived departments still appear on historical jobs.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "departments", type: "array", label: "Departments" },
    { key: "count", type: "number", label: "Departments returned" },
    { key: "syncToken", type: "string", label: "Store this and pass it next run" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new AshbyClient(ctx);
    const returnAll = p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll(
      "department.list",
      compact({
        syncToken: p.syncToken,
        includeArchived: p.includeArchived === true ? true : undefined,
      }),
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    return { departments: page.items, count: page.items.length, syncToken: page.syncToken };
  },
};

export default action;
