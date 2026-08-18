import type { ActionDefinition } from "@w6w/types";
import { FivetranClient } from "../lib/client.ts";

/**
 * `POST /v1/transformations/{id}/run` — run the dbt models.
 *
 * ## This is the other half of the pipeline
 *
 * Fivetran loads raw data; transformations turn it into something usable —
 * usually dbt, either a Quickstart package or a project pointed at your own
 * repository. So the canonical chain is **`connection-sync` → wait →
 * `transformation-run` → notify**, and this is the middle step.
 *
 * Running it before the sync has finished transforms yesterday's data, which is
 * not an error and produces a report that is quietly a day old. `connection-get`
 * polling `sync_state` is what goes between them.
 *
 * ## `full_refresh` rebuilds the models from scratch
 *
 * dbt's incremental models normally append; a full refresh drops and rebuilds
 * them. That is the fix when a model's logic changed and its history is now
 * wrong — and it is expensive in warehouse compute, which is billed by whoever
 * owns the warehouse rather than by Fivetran.
 *
 * It is not gated as heavily as `connection-resync` because the cost lands on
 * your own warehouse rather than a per-row bill, but it is off by default and
 * says what it does.
 */
const action: ActionDefinition = {
  key: "transformation-run",
  type: "perform",
  resource: "transformation",
  title: "Run a transformation",
  description:
    "Run the dbt models. Firing this before the sync has finished transforms yesterday's data — " +
    "not an error, and quietly a day old.",
  idempotent: false,
  params: [
    {
      key: "transformationId",
      label: "Transformation ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "fullRefresh",
      label: "Full Refresh",
      type: "boolean",
      default: false,
      hint: "Drops and rebuilds incremental models instead of appending — the fix when a model's " +
        "logic changed and its history is now wrong. Expensive in warehouse compute, which your " +
        "warehouse bills rather than Fivetran.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Transformation ID" },
    { key: "queued", type: "boolean", label: "The run was accepted — not that it finished" },
    { key: "fullRefresh", type: "boolean", label: "Whether models were rebuilt from scratch" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const transformationId = String(p.transformationId ?? "").trim();
    if (!transformationId) throw new Error("`transformationId` is required");
    const fullRefresh = p.fullRefresh === true;

    if (fullRefresh) {
      ctx.log(
        "warn",
        "running a Fivetran transformation with a FULL REFRESH — incremental " +
          "models will be dropped and rebuilt",
        { transformationId },
      );
    }

    const result = await new FivetranClient(ctx).request(
      `/v1/transformations/${encodeURIComponent(transformationId)}/run`,
      { method: "POST", body: { full_refresh: fullRefresh } },
    );

    ctx.log("info", "queued a Fivetran transformation run", { transformationId });
    return { ...(result as Record<string, unknown>), queued: true, fullRefresh };
  },
};

export default action;
