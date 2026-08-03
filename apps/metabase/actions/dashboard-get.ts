import type { ActionDefinition } from "@w6w/types";
import { MetabaseClient } from "../lib/client.ts";
import { dashboardOutput } from "../lib/params.ts";

/**
 * `GET /api/dashboard/{id}` — fetch a dashboard with its card placements.
 *
 * The reason this is not just "the singular of `dashboard-list`" is
 * **`dashcards`**. The list endpoint returns dashboard records without them;
 * only this endpoint returns the placements, and a placement is what
 * `dashboard-card-run` needs:
 *
 *     "dashcards": [ { "id": 1, "card_id": 21,
 *                      "card": { "name": "Best selling products", … },
 *                      "parameter_mappings": [ … ] },
 *                    { "id": 2, "card_id": 24, … } ]
 *
 * Verified live against the sample "E-commerce Insights" dashboard: `id` is the
 * *dashcard* id (the placement), `card_id` is the *question* id, and they are
 * different numbers. Confusing the two is the single commonest way to get a 404
 * out of the dashboard-card query endpoint, so both are called out in that
 * action's params.
 *
 * `parameters` on the dashboard record describes the dashboard's own filters —
 * the dropdowns at the top — and `parameter_mappings` on each dashcard says
 * which of those filters wire into which field of that card's query. Together
 * they are the map for running a dashboard card with the dashboard's filters
 * applied.
 */
interface Input {
  dashboardId: number | string;
}

const dashboardGet: ActionDefinition<Input> = {
  key: "dashboard-get",
  type: "read",
  resource: "dashboard",
  title: "Get Dashboard",
  description:
    "Fetch one dashboard with its card placements (`dashcards`), tabs and filter definitions.",
  params: [
    {
      key: "dashboardId",
      label: "Dashboard ID",
      type: "string",
      required: true,
      hint: "The number in the dashboard's URL (/dashboard/3-revenue → 3), or its 21-character " +
        "entity id.",
    },
  ],
  output: dashboardOutput,

  execute(input, ctx) {
    return new MetabaseClient(ctx).request(
      `/api/dashboard/${encodeURIComponent(String(input.dashboardId))}`,
    );
  },
};

export default dashboardGet;
