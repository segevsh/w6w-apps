import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient, query } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v3/accounts/{account}/projects/{project}/environments/` — where a
 * project's jobs actually build.
 *
 * An environment ties a dbt version, a warehouse connection and a target schema
 * together, and every job belongs to one. Its `deployment_type` —
 * `production` or `staging` — is the field that decides how alarming a failure
 * is, and it is the one worth filtering on: "did anything fail in production
 * last night" is a different question from "did anything fail".
 *
 * `dbt_version` is the other one to watch. dbt Cloud pins a version per
 * environment, so an upgrade that works in staging and not in production is a
 * version difference sitting in plain sight here.
 */
const action: ActionDefinition = {
  key: "environment-list",
  type: "read",
  resource: "environment",
  title: "List environments",
  description: "Where a project's jobs build — dbt version, warehouse connection and target. " +
    "`deployment_type` is what makes a failure alarming or not.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true, default: "" },
    {
      key: "deploymentType",
      label: "Deployment Type",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any" },
        { value: "production", label: "Production only" },
        { value: "staging", label: "Staging only" },
      ],
    },
    {
      key: "includeRelated",
      label: "Include Related",
      type: "string",
      default: "",
      advanced: true,
      hint: "`project`, `connection`, `credentials`, `repository`.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "environments", type: "array", label: "Environments" },
    { key: "count", type: "number", label: "Environments returned" },
    { key: "totalCount", type: "number", label: "Environments in the project" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");

    const client = new DbtCloudClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const { items, totalCount } = await client.requestAll(
      `/api/v3/accounts/${client.accountId}/projects/${
        encodeURIComponent(projectId)
      }/environments/`,
      {
        query: query({
          deployment_type: p.deploymentType,
          include_related: p.includeRelated,
        }),
      },
      want,
    );
    return { environments: items, count: items.length, totalCount };
  },
};

export default action;
