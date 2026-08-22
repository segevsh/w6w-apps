import type { ActionDefinition } from "@w6w/types";
import { MixpanelClient } from "../lib/client.ts";

/**
 * `POST /api/query/cohorts/list` — the project's saved cohorts.
 *
 * A `POST` that reads, which is Mixpanel's choice rather than a mistake here.
 *
 * Cohorts are the useful unit for a workflow because they are somebody's
 * agreed definition of a group — "activated accounts", "at risk" — maintained
 * in the UI where the definition can change without the workflow knowing. Each
 * entry carries the `id` that `profile-query`'s cohort filter takes, plus a
 * `count` and whether it is `is_visible`.
 */
const action: ActionDefinition = {
  key: "cohort-list",
  type: "read",
  resource: "cohort",
  title: "List cohorts",
  description:
    "Saved cohorts with their ids and sizes — the agreed definitions a workflow should filter " +
    "by rather than re-deriving.",
  params: [],
  output: [
    { key: "cohorts", type: "array", label: "Cohorts" },
  ],

  async execute(_input, ctx) {
    // A POST that reads — Mixpanel's shape for this route.
    const cohorts = await new MixpanelClient(ctx).request<unknown[]>("/api/query/cohorts/list", {
      method: "POST",
      form: true,
      body: {},
    });
    return { cohorts };
  },
};

export default action;
