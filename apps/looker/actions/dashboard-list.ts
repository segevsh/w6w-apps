import type { ActionDefinition } from "@w6w/types";
import { LookerClient } from "../lib/client.ts";

/**
 * `GET /api/4.0/dashboards` — the dashboards this user can see.
 *
 * ## A dashboard is many queries, not one
 *
 * Each tile runs its own query against the warehouse. So "refresh the
 * dashboard" is a dozen concurrent queries, and a scheduled dashboard delivery
 * is a dozen queries on a timer. That is why this app runs Looks and inline
 * queries rather than offering to render dashboards: a workflow wanting one
 * number should ask for one number.
 *
 * ## LookML dashboards and user-defined dashboards are different things
 *
 * A user-defined dashboard has a numeric id and lives in the database; a LookML
 * dashboard is defined in code and has an id like `model::dashboard_name`. They
 * appear in the same list, and only one of them can be edited through the API.
 */
const action: ActionDefinition = {
  key: "dashboard-list",
  type: "search",
  resource: "dashboard",
  title: "List dashboards",
  description:
    "Dashboards visible to this credential's user. Each TILE is its own warehouse query, so a " +
    "dashboard refresh is many queries — a workflow that wants one number should run a Look.",
  params: [
    {
      key: "title",
      label: "Title Contains",
      type: "string",
      default: "",
    },
    {
      key: "includeDeleted",
      label: "Include soft-deleted",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "dashboards", type: "array", label: "The dashboards" },
    { key: "count", type: "number", label: "Matching" },
    { key: "ids", type: "array", label: "Just the ids" },
    { key: "lookmlCount", type: "number", label: "Defined in code, and not editable here" },
    { key: "userDefinedCount", type: "number", label: "Defined in the interface" },
    { key: "deletedCount", type: "number", label: "Soft-deleted, and recoverable" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const all = await new LookerClient(ctx).request<
      Array<{ id?: string; title?: string; deleted?: boolean; model?: { id?: string } | null }>
    >("/dashboards", { query: { fields: "id,title,deleted,model(id)" } });

    const list = Array.isArray(all) ? all : [];
    const deleted = list.filter((dashboard) => dashboard?.deleted === true);
    const visible = p.includeDeleted === true
      ? list
      : list.filter((dashboard) => dashboard?.deleted !== true);

    const needle = String(p.title ?? "").trim().toLowerCase();
    const dashboards = needle
      ? visible.filter((dashboard) => String(dashboard?.title ?? "").toLowerCase().includes(needle))
      : visible;

    // A LookML dashboard's id looks like `model::name` and is defined in code.
    const lookml = dashboards.filter((dashboard) => String(dashboard?.id ?? "").includes("::"));

    return {
      dashboards,
      count: dashboards.length,
      ids: dashboards.map((dashboard) => dashboard?.id).filter(Boolean),
      lookmlCount: lookml.length,
      userDefinedCount: dashboards.length - lookml.length,
      deletedCount: deleted.length,
    };
  },
};

export default action;
