import type { ActionDefinition } from "@w6w/types";
import { AzureDevOpsClient, query } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /{org}/_apis/projects` — the projects this token can see.
 *
 * The first call in most workflows, because nearly every other path needs a
 * project, and the honest answer to "which projects exist" is *"which projects
 * can this token see"* — Azure DevOps returns only those, and says nothing
 * about the rest.
 *
 * That makes this the diagnostic for the app's most confusing failure. A token
 * missing the **Project and Team (read)** scope authenticates perfectly and
 * sees nothing; every subsequent call then answers `404`, as though the
 * projects were gone. An empty list here is the difference between "the project
 * name is wrong" and "this token cannot see any project at all".
 *
 * `stateFilter` includes projects being created or deleted, which are otherwise
 * absent — useful when a workflow just created one and it has not finished.
 */
const action: ActionDefinition = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List projects",
  description:
    "The projects this token can SEE — Azure DevOps says nothing about the rest. An empty list " +
    "on a real organization means a missing Project and Team scope, not an empty account.",
  params: [
    {
      key: "stateFilter",
      label: "State",
      type: "select",
      default: "wellFormed",
      options: [
        { value: "wellFormed", label: "Ready to use" },
        { value: "createPending", label: "Still being created" },
        { value: "all", label: "All states, including deleting" },
      ],
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "projects", type: "array", label: "Projects" },
    { key: "count", type: "number", label: "Projects returned" },
    { key: "names", type: "array", label: "Just the names, for a quick read" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new AzureDevOpsClient(ctx);

    const projects = await client.list<{ id?: string; name?: string }>(
      client.path("_apis/projects"),
      {
        query: query({
          stateFilter: p.stateFilter === undefined ? "wellFormed" : String(p.stateFilter),
          $top: Math.max(1, Number(p.limit ?? 100)),
          $skip: Number(p.skip ?? 0) || undefined,
        }),
      },
    );

    return {
      projects,
      count: projects.length,
      names: projects.map((pr) => String(pr?.name ?? "")).filter(Boolean),
    };
  },
};

export default action;
