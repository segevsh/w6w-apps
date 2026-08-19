import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, query } from "../lib/client.ts";
import { PAGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/atlas/v2/groups` — the projects this account can reach.
 *
 * ## `groups` is `projects`
 *
 * The console says project, the API says group, and they are the same thing.
 * The name predates Atlas — MongoDB Cloud Manager called them groups — and it
 * survives in every path while the documentation prose says project. Searching
 * the docs for "project" finds explanations; the URLs say `groups`.
 *
 * ## This is how a name becomes an id
 *
 * No project-scoped path accepts a name. A workflow that knows "the staging
 * project" and not its ObjectId starts here, which is why this action filters
 * by name locally rather than making the caller page through.
 *
 * ## A project's roles are separate from the organisation's
 *
 * A service account with an organisation role still sees only the projects it
 * has been granted a role on, so this list can be shorter than the console
 * shows a person.
 */
const action: ActionDefinition = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List projects",
  description:
    "The projects this account can reach — `groups` in every path, `projects` in the console. " +
    "This is how a project NAME becomes the id everything else needs.",
  params: [
    {
      key: "name",
      label: "Name Contains",
      type: "string",
      default: "",
      hint: "Matched here, case-insensitively — the API has no name filter.",
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "projects", type: "array", label: "The projects" },
    { key: "count", type: "number", label: "Matching" },
    { key: "ids", type: "array", label: "Just the project ids" },
    { key: "id", type: "string", label: "The id, when exactly one matched" },
    { key: "totalCount", type: "number", label: "Across all pages, before filtering" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { results, totalCount } = await new AtlasClient(ctx).list<
      { id?: string; name?: string; clusterCount?: number; orgId?: string }
    >("/api/atlas/v2/groups", {
      // `groups` exists only at the original version; asking for a newer one
      // resolves back to it.
      query: query({
        itemsPerPage: Math.min(500, Math.max(1, Number(p.itemsPerPage ?? 100))),
        pageNum: Math.max(1, Number(p.pageNum ?? 1)),
      }),
    });

    const needle = String(p.name ?? "").trim().toLowerCase();
    const projects = needle
      ? results.filter((project) => String(project?.name ?? "").toLowerCase().includes(needle))
      : results;

    return {
      projects,
      count: projects.length,
      ids: projects.map((project) => project?.id).filter(Boolean),
      // The common case — a workflow naming one project and wanting its id.
      id: projects.length === 1 ? projects[0]?.id : undefined,
      totalCount,
    };
  },
};

export default action;
