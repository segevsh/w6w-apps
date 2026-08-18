import type { ActionDefinition } from "@w6w/types";
import { FivetranClient } from "../lib/client.ts";

/**
 * `GET /v1/transformations/{id}` — one dbt job, and when it last ran.
 *
 * The field worth the call is the schedule. A transformation can be scheduled
 * by **time**, or **by the connections that feed it** — Fivetran calls the
 * second an integrated schedule, and it runs the models when the syncs they
 * depend on finish.
 *
 * That is the better arrangement, and it is also the reason a workflow that
 * *also* triggers `transformation-run` can end up running the models twice: the
 * integrated schedule fires on the sync this workflow just triggered. Reading
 * the schedule before adding a manual trigger is how that gets noticed.
 */
const action: ActionDefinition = {
  key: "transformation-get",
  type: "read",
  resource: "transformation",
  title: "Get a transformation",
  description:
    "One dbt job and its schedule. A transformation scheduled by its upstream connections will " +
    "also fire on a sync you trigger — which is how the models get run twice.",
  params: [
    {
      key: "transformationId",
      label: "Transformation ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Transformation ID" },
    { key: "status", type: "string", label: "Last run's outcome" },
    { key: "schedule", type: "object", label: "Time-based, or driven by upstream connections" },
    { key: "created_at", type: "string", label: "When it was created" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const transformationId = String(p.transformationId ?? "").trim();
    if (!transformationId) throw new Error("`transformationId` is required");
    return await new FivetranClient(ctx).request(
      `/v1/transformations/${encodeURIComponent(transformationId)}`,
    );
  },
};

export default action;
