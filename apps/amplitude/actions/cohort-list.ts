import type { ActionDefinition } from "@w6w/types";
import { AmplitudeClient } from "../lib/client.ts";

/**
 * `GET /api/3/cohorts` — the behavioural cohorts defined in this project.
 *
 * A cohort is a saved set of users defined by what they did — "used the export
 * feature in the last 30 days", "signed up but never converted". They are how
 * an analytics answer becomes an audience, and they are the thing most worth
 * syncing outward: a cohort exported to an email tool is a campaign.
 *
 * ## `size` is a snapshot, and cohorts drift
 *
 * A behavioural cohort is recomputed on a schedule, so its size is as of the
 * last computation rather than now. `last_computed` is the field that says
 * when, and a cohort that stopped recomputing keeps reporting its last size
 * indefinitely.
 *
 * This lists the definitions. Downloading the membership is a separate,
 * asynchronous request-and-poll flow, deliberately not wrapped here — a
 * workflow that blocks on it would sit waiting for minutes.
 */
const action: ActionDefinition = {
  key: "cohort-list",
  type: "read",
  resource: "cohort",
  title: "List cohorts",
  description:
    "Behavioural cohorts — saved sets of users defined by what they did. `size` is as of the " +
    "last recomputation, and a cohort that stopped recomputing keeps reporting it.",
  params: [],
  output: [
    { key: "cohorts", type: "array", label: "Cohort definitions" },
    { key: "count", type: "number", label: "How many" },
    { key: "totalMembers", type: "number", label: "Sum of the reported sizes" },
    { key: "names", type: "array", label: "Just the names" },
  ],

  async execute(_input, ctx) {
    const result = await new AmplitudeClient(ctx).dashboard<{
      cohorts?: Array<{ id?: string; name?: string; size?: number; last_computed?: number }>;
    }>("/api/3/cohorts");

    const cohorts = result?.cohorts ?? [];
    return {
      cohorts,
      count: cohorts.length,
      // Sizes are snapshots from each cohort's own last computation, so this is
      // a rough total rather than a headcount.
      totalMembers: cohorts.reduce((sum, cohort) => sum + Number(cohort?.size ?? 0), 0),
      names: cohorts.map((cohort) => cohort?.name).filter(Boolean),
    };
  },
};

export default action;
