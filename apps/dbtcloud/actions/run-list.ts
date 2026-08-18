import type { ActionDefinition } from "@w6w/types";
import { csv, DbtCloudClient, query, runStatusName } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v2/accounts/{account}/runs/` — run history, filtered.
 *
 * Two uses, and they want opposite orderings:
 *
 *   - **"what is happening right now"** — filter to the in-flight statuses
 *     (Queued, Starting, Running) and you have the queue. Useful before
 *     triggering: a job already running means the trigger is about to make a
 *     second, concurrent run rather than being ignored.
 *   - **"what happened"** — order by `-finished_at` and read the failures.
 *
 * The default here is newest first, because "what broke last night" is the more
 * common question.
 *
 * `status__in` takes the numbers, so this action offers the named states and
 * translates. `job_definition_id` narrows to one job, which is how "has last
 * night's hourly job ever failed" gets asked.
 */
const IN_FLIGHT = [1, 2, 3];
const FINISHED = [10, 20, 30];

const action: ActionDefinition = {
  key: "run-list",
  type: "read",
  resource: "run",
  title: "List runs",
  description:
    "Run history, filtered by job, project or state. Filtering to the in-flight states before " +
    "triggering is how you avoid starting a second concurrent run.",
  params: [
    {
      key: "state",
      label: "State",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "Any state" },
        { value: "in-flight", label: "In flight — Queued, Starting or Running" },
        { value: "finished", label: "Finished — Success, Error or Cancelled" },
        { value: "success", label: "Success only" },
        { value: "error", label: "Error only" },
        { value: "cancelled", label: "Cancelled only" },
      ],
    },
    { key: "jobId", label: "Job ID", type: "string", default: "" },
    { key: "projectId", label: "Project ID", type: "string", default: "" },
    { key: "environmentId", label: "Environment ID", type: "string", default: "", advanced: true },
    {
      key: "orderBy",
      label: "Order By",
      type: "select",
      default: "-id",
      options: [
        { value: "-id", label: "Newest first" },
        { value: "id", label: "Oldest first" },
        { value: "-finished_at", label: "Most recently finished" },
        { value: "-created_at", label: "Most recently created" },
      ],
    },
    {
      key: "includeRelated",
      label: "Include Related",
      type: "string",
      default: "",
      advanced: true,
      hint: "`trigger`, `job`, `audit`, `debug_logs`.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "runs", type: "array", label: "Runs, each with a named status" },
    { key: "count", type: "number", label: "Runs returned" },
    { key: "totalCount", type: "number", label: "Runs matching the filter" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new DbtCloudClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const state = p.state === undefined ? "all" : String(p.state);
    const statuses = state === "in-flight"
      ? IN_FLIGHT
      : state === "finished"
      ? FINISHED
      : state === "success"
      ? [10]
      : state === "error"
      ? [20]
      : state === "cancelled"
      ? [30]
      : undefined;

    const { items, totalCount } = await client.requestAll<{ status?: number }>(
      `/api/v2/accounts/${client.accountId}/runs/`,
      {
        query: query({
          status__in: statuses,
          job_definition_id: p.jobId,
          project_id: p.projectId,
          environment_id: p.environmentId,
          order_by: p.orderBy === undefined ? "-id" : String(p.orderBy),
          include_related: csv(p.includeRelated)?.join(","),
        }),
      },
      want,
    );

    const runs = items.map((r) => ({ ...r, statusName: runStatusName(r?.status) }));
    return { runs, count: runs.length, totalCount };
  },
};

export default action;
