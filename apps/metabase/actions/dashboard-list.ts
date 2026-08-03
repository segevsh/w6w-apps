import type { ActionDefinition } from "@w6w/types";
import { MetabaseClient } from "../lib/client.ts";
import { dashboardFilterOptions } from "../lib/params.ts";

/**
 * `GET /api/dashboard` — list dashboards.
 *
 * A bare array, no pagination, one query parameter (`f`, with the three-value
 * enum `all | mine | archived`). Verified live: a stock instance returned one
 * dashboard as a top-level array.
 *
 * The elements are the dashboard *records* without their `dashcards` — the card
 * placements come only from `GET /api/dashboard/{id}`, which is why
 * `dashboard-get` exists as a separate action rather than this one being
 * enough. As with `question-list`, `search` is the way to get a bounded,
 * filterable list on a large instance.
 */
interface Input {
  f?: string;
}

const dashboardList: ActionDefinition<Input> = {
  key: "dashboard-list",
  type: "search",
  resource: "dashboard",
  title: "List Dashboards",
  description: "List dashboards. Returns a bare array with no pagination.",
  params: [
    {
      key: "f",
      label: "Filter",
      type: "select",
      default: "all",
      options: dashboardFilterOptions,
    },
  ],
  output: [
    { key: "[]", type: "array", label: "Dashboards — a bare array, without their cards" },
  ],

  execute(input, ctx) {
    return new MetabaseClient(ctx).request("/api/dashboard", { query: { f: input.f } });
  },
};

export default dashboardList;
