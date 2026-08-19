import type { ActionDefinition } from "@w6w/types";
import { GerritClient, query } from "../lib/client.ts";

/**
 * `GET /a/projects/` — the repositories.
 *
 * ## Keyed by name, again
 *
 * Gerrit's list endpoints return objects keyed by identifier rather than
 * arrays. This one is keyed by project name, and the name is itself a path —
 * `platform/frameworks/base` — so a project name contains slashes and must be
 * encoded when used in a URL.
 *
 * ## `All-Projects` and `All-Users` are configuration, not code
 *
 * Every Gerrit has them. `All-Projects` holds the access rules every other
 * project inherits, and `All-Users` holds account data and preferences. They
 * are repositories in the API and they are not somewhere anybody pushes
 * source, so counting them as projects overstates a Gerrit's size.
 *
 * ## `state` distinguishes read-only from hidden
 *
 * `ACTIVE` is normal, `READ_ONLY` means pushes are refused — the usual state
 * of a migrated repository — and `HIDDEN` means it does not appear in the UI.
 * A workflow that tries to push to a read-only project gets a failure that
 * mentions permissions rather than state.
 */
const action: ActionDefinition = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List projects",
  description:
    "The repositories, returned KEYED BY NAME — and a Gerrit project name is a path with " +
    "slashes in it. Separates `All-Projects` and `All-Users`, which are configuration " +
    "repositories rather than code, and reports read-only ones.",
  params: [
    {
      key: "prefix",
      label: "Name prefix",
      type: "string",
      default: "",
      placeholder: "platform/",
      hint: "Gerrit matches on the start of the name, and names are paths.",
    },
    {
      key: "substring",
      label: "Name contains",
      type: "string",
      default: "",
    },
    {
      key: "includeConfigRepos",
      label: "Include All-Projects and All-Users",
      type: "boolean",
      default: false,
    },
    {
      key: "includeDescription",
      label: "Include descriptions",
      type: "boolean",
      default: false,
    },
    { key: "limit", label: "Limit", type: "number", default: 100 },
  ],
  output: [
    { key: "projects", type: "array", label: "The projects" },
    { key: "count", type: "number", label: "How many, after filtering" },
    { key: "names", type: "array", label: "Just the names" },
    { key: "readOnly", type: "array", label: "Pushes are refused" },
    { key: "hidden", type: "array", label: "Not shown in the interface" },
    { key: "configRepos", type: "array", label: "Configuration rather than code" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const byName = await new GerritClient(ctx).request<
      Record<string, { id?: string; state?: string; description?: string; parent?: string }>
    >("/projects/", {
      query: query({
        p: String(p.prefix ?? "").trim() || undefined,
        m: String(p.substring ?? "").trim() || undefined,
        d: p.includeDescription === true ? true : undefined,
        n: Math.max(1, Math.min(1000, Number(p.limit ?? 100))),
      }),
    });

    const CONFIG_REPOS = ["All-Projects", "All-Users"];
    const entries = Object.entries(byName ?? {});
    const projects = entries
      .filter(([name]) => p.includeConfigRepos === true || !CONFIG_REPOS.includes(name))
      .map(([name, project]) => ({
        name,
        state: project?.state ?? "ACTIVE",
        description: project?.description,
        parent: project?.parent,
      }));

    return {
      projects,
      count: projects.length,
      names: projects.map((project) => project.name),
      // A push to one of these fails in terms of permissions, not state.
      readOnly: projects.filter((project) => project.state === "READ_ONLY").map((p) => p.name),
      hidden: projects.filter((project) => project.state === "HIDDEN").map((p) => p.name),
      configRepos: entries.map(([name]) => name).filter((name) => CONFIG_REPOS.includes(name)),
    };
  },
};

export default action;
