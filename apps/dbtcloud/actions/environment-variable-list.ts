import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient } from "../lib/client.ts";

/**
 * `GET /api/v3/accounts/{account}/projects/{project}/environment-variables/environment/`
 * — the project's environment variables, laid out per environment.
 *
 * The response is a matrix rather than a list: each variable name maps to the
 * environments that set it, with the project-level default under `project`. So
 * this is the one call that answers "does staging still have the old value" —
 * a question that otherwise means clicking through every environment.
 *
 * ## Secrets come back masked, and that is the point
 *
 * A variable named `DBT_ENV_SECRET_*` is returned with its value replaced by
 * `**********`. dbt does that deliberately, which means this action can be
 * given to a workflow that audits configuration **without** handing it the
 * credentials in that configuration.
 *
 * It also means the mask is a fact worth reporting rather than a gap: this
 * returns `secretNames` so a drift check can say "staging is missing
 * `DBT_ENV_SECRET_SNOWFLAKE_KEY`" without ever seeing a key. What it cannot do
 * is compare two masked values — they are equal whether or not the underlying
 * secrets are.
 */
const action: ActionDefinition = {
  key: "environment-variable-list",
  type: "read",
  resource: "environment-variable",
  title: "List environment variables",
  description:
    "A project's environment variables per environment — the one call that shows whether staging " +
    "still has the old value. Secret values come back masked by dbt.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "environments", type: "array", label: "Environment names, in dbt's order" },
    { key: "variables", type: "object", label: "name → environment → {id, value}" },
    { key: "secretNames", type: "array", label: "Variables whose values dbt masked" },
    { key: "count", type: "number", label: "Variables defined" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");

    const client = new DbtCloudClient(ctx);
    const data = await client.request<{
      environments?: string[];
      variables?: Record<string, Record<string, { value?: string }>>;
    }>(
      `/api/v3/accounts/${client.accountId}/projects/${
        encodeURIComponent(projectId)
      }/environment-variables/environment/`,
    );

    const variables = data?.variables ?? {};
    // dbt masks a value it considers secret; the NAME is still information a
    // drift check needs, and carries nothing sensitive.
    const secretNames = Object.entries(variables)
      .filter(([, byEnv]) =>
        Object.values(byEnv ?? {}).some((v) => /^\*+$/.test(String(v?.value ?? "")))
      )
      .map(([name]) => name)
      .sort();

    return {
      environments: data?.environments ?? [],
      variables,
      secretNames,
      count: Object.keys(variables).length,
    };
  },
};

export default action;
