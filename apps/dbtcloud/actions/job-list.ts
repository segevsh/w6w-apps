import type { ActionDefinition } from "@w6w/types";
import { csv, DbtCloudClient, query, runStatusName } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v2/accounts/{account}/jobs/` — the jobs, and how they last did.
 *
 * The parameter that makes this useful rather than a lookup table is
 * `include_related=most_recent_run`. With it, one call answers "which jobs are
 * currently broken" — a question that otherwise needs a run query per job. This
 * action offers it as a plain toggle and decodes the status number, so a
 * morning digest is one step.
 *
 * `is_system` defaults to false, which hides the jobs dbt Cloud creates for CI
 * on pull requests. That is nearly always right — those are noise beside the
 * scheduled builds — but it is exposed, because "why does the API not show my
 * CI job" has exactly this answer.
 */
const action: ActionDefinition = {
  key: "job-list",
  type: "read",
  resource: "job",
  title: "List jobs",
  description:
    "The account's jobs. Including the most recent run turns this into one call that answers " +
    "which jobs are currently broken.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", default: "" },
    { key: "environmentId", label: "Environment ID", type: "string", default: "" },
    {
      key: "nameContains",
      label: "Name Contains",
      type: "string",
      default: "",
      hint: "Case-insensitive substring.",
    },
    {
      key: "withLastRun",
      label: "Include Last Run",
      type: "boolean",
      default: true,
      hint: "Adds `most_recent_run` — how each job last did, without a call per job.",
    },
    {
      key: "includeSystemJobs",
      label: "Include CI Jobs",
      type: "boolean",
      default: false,
      hint: "dbt's own pull-request CI jobs are hidden by default. This is why a CI job you can " +
        "see in the UI is missing from the API.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "jobs", type: "array", label: "Jobs" },
    { key: "count", type: "number", label: "Jobs returned" },
    { key: "failingCount", type: "number", label: "Jobs whose last run errored" },
    { key: "totalCount", type: "number", label: "Jobs matching the filter" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new DbtCloudClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const withLastRun = p.withLastRun === undefined ? true : p.withLastRun === true;

    const related = csv(p.includeRelated) ?? [];
    if (withLastRun) related.push("most_recent_run");

    const { items, totalCount } = await client.requestAll<
      { most_recent_run?: { status?: number } }
    >(
      `/api/v2/accounts/${client.accountId}/jobs/`,
      {
        query: query({
          project_id: p.projectId,
          environment_id: p.environmentId,
          name__icontains: p.nameContains,
          is_system: p.includeSystemJobs === true ? undefined : false,
          include_related: related.length > 0 ? related.join(",") : undefined,
        }),
      },
      want,
    );

    const jobs = items.map((job) => {
      const status = job?.most_recent_run?.status;
      return status === undefined ? job : { ...job, lastRunStatusName: runStatusName(status) };
    });
    const failingCount = items.filter((j) => Number(j?.most_recent_run?.status) === 20).length;

    return { jobs, count: jobs.length, failingCount, totalCount };
  },
};

export default action;
