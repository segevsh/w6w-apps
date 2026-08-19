import type { ActionDefinition } from "@w6w/types";
import { AtlasClient, projectId } from "../lib/client.ts";
import { CLUSTER_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * Pause or resume a cluster — `PATCH …/clusters/{name}` with `paused`.
 *
 * ## The cheapest thing this API can do for a bill
 *
 * A paused cluster keeps its data, its configuration, its users and its
 * connection string, and stops billing for compute. Storage is still charged.
 * Pausing development clusters outside working hours is the single most
 * common reason to point a scheduled workflow at Atlas, and it is why this is
 * its own action rather than a flag on `cluster-update`.
 *
 * ## Three things Atlas does that a scheduler has to know
 *
 * - **A paused cluster resumes itself after 30 days.** Atlas will not leave
 *   one paused indefinitely, so "pause it and forget it" turns back into a
 *   bill roughly a month later.
 * - **A cluster cannot be paused again for 60 minutes after resuming.** The
 *   attempt is a 409, so a schedule that resumes at 09:00 and pauses at 09:30
 *   fails every day.
 * - **Pausing is not instant.** The cluster goes to `UPDATING` and refuses
 *   other changes until it settles.
 *
 * ## An already-paused cluster is a no-op, not an error
 *
 * This action reads the state first and reports `changed`, because a scheduled
 * pause running against something already paused should not look like a
 * failure.
 */
const action: ActionDefinition = {
  key: "cluster-pause",
  type: "perform",
  resource: "cluster",
  title: "Pause or resume a cluster",
  description:
    "Stop or restart a cluster's compute billing, keeping its data. Atlas RESUMES a paused " +
    "cluster after 30 days by itself, and refuses to re-pause one for 60 minutes after it " +
    "resumes.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    CLUSTER_PARAM,
    {
      key: "paused",
      label: "Paused",
      type: "boolean",
      default: true,
      hint: "On pauses it; off resumes it.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "The cluster" },
    { key: "paused", type: "boolean", label: "Whether it is now paused" },
    { key: "changed", type: "boolean", label: "False when it was already in that state" },
    { key: "stateName", type: "string", label: "UPDATING while it settles" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = projectId(p.projectId);
    const name = String(p.cluster ?? "").trim();
    if (!name) throw new Error("`cluster` is required");
    const paused = p.paused !== false;

    const client = new AtlasClient(ctx);
    const path = `/api/atlas/v2/groups/${id}/clusters/${encodeURIComponent(name)}`;

    const before = await client.request<{ paused?: boolean; stateName?: string }>(path, {
      version: "2024-08-05",
    });

    // A scheduled pause hitting an already-paused cluster is a no-op, not a
    // failure — and Atlas would answer 409 rather than shrugging.
    if (before?.paused === paused) {
      ctx.log("info", `Atlas cluster is already ${paused ? "paused" : "running"}`, { name });
      return { name, paused, changed: false, stateName: before?.stateName };
    }

    const cluster = await client.request<{ paused?: boolean; stateName?: string }>(path, {
      method: "PATCH",
      version: "2024-08-05",
      body: { paused },
    });

    ctx.log("info", paused ? "paused an Atlas cluster" : "resumed an Atlas cluster", { name });

    return {
      name,
      paused: cluster?.paused === true,
      changed: true,
      stateName: cluster?.stateName,
    };
  },
};

export default action;
