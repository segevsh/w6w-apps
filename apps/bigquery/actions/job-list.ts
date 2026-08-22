import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, resolveProject } from "../lib/client.ts";
import { LIST_PARAMS, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /projects/{projectId}/jobs` — verified against BigQuery's discovery
 * document (`jobs.list`).
 *
 * Note the default: BigQuery returns **only the caller's own jobs** unless
 * `allUsers` is set, which is a common surprise when auditing what ran.
 */
const action: ActionDefinition = {
  key: "job-list",
  type: "read",
  resource: "job",
  title: "List jobs",
  description: "List recent jobs in a project.",
  params: [
    PROJECT_PARAM,
    ...LIST_PARAMS,
    {
      key: "allUsers",
      label: "All Users",
      type: "boolean",
      default: false,
      hint: "Off by default, BigQuery returns only the jobs this connection started.",
    },
    {
      key: "stateFilter",
      label: "State",
      type: "select",
      default: "",
      options: [
        { value: "pending", label: "Pending" },
        { value: "running", label: "Running" },
        { value: "done", label: "Done" },
      ],
    },
    {
      key: "minCreationTime",
      label: "Created After (ms)",
      type: "string",
      default: "",
      hint: "Milliseconds since the epoch.",
    },
    { key: "maxCreationTime", label: "Created Before (ms)", type: "string", default: "" },
    {
      key: "parentJobId",
      label: "Parent Job ID",
      type: "string",
      default: "",
      hint: "Show only the child jobs of this one — how a script's steps are found.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing BigQuery jobs", { project, returnAll, limit });

    return await new BigQueryClient(ctx).requestAll(
      `/projects/${encodeURIComponent(project)}/jobs`,
      "jobs",
      {
        query: {
          allUsers: p.allUsers === true ? "true" : undefined,
          stateFilter: (p.stateFilter as string) || undefined,
          minCreationTime: (p.minCreationTime as string) || undefined,
          maxCreationTime: (p.maxCreationTime as string) || undefined,
          parentJobId: (p.parentJobId as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
