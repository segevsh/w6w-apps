import type { ActionDefinition } from "@w6w/types";
import { FivetranClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/transformation-projects` — the dbt repositories Fivetran runs from.
 *
 * A project is the link between Fivetran and a git repository: which repo,
 * which branch, which dbt version, and the destination it builds into. One
 * project usually backs several transformations.
 *
 * The reason to read it from a workflow is the **branch and dbt version**.
 * "The models changed and nobody deployed anything" is usually a project
 * tracking `main` and somebody merging; "it worked last week and now it does
 * not" is sometimes a dbt version Fivetran upgraded. Both are visible here and
 * nowhere else in the API.
 */
const action: ActionDefinition = {
  key: "transformation-project-list",
  type: "read",
  resource: "transformation",
  title: "List transformation projects",
  description:
    "The dbt repositories Fivetran builds from — repo, branch and dbt version. Where 'the models " +
    "changed and nobody deployed' turns out to be a project tracking main.",
  params: [...LIST_PARAMS],
  output: [
    { key: "projects", type: "array", label: "Transformation projects" },
    { key: "count", type: "number", label: "Projects returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new FivetranClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const page = await client.pageAll(
      "/v1/transformation-projects",
      {},
      want,
      Math.max(1, Number(p.maxPages ?? 20)),
    );
    return { projects: page.items, count: page.items.length };
  },
};

export default action;
