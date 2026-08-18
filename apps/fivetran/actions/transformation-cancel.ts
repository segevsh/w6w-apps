import type { ActionDefinition } from "@w6w/types";
import { FivetranClient } from "../lib/client.ts";

/**
 * `POST /v1/transformations/{id}/cancel` — stop a running transformation.
 *
 * The same caveat as cancelling any warehouse job: **models already built stay
 * built**. dbt commits each model as it completes, so a run stopped halfway
 * leaves some tables rebuilt against today's data and the rest against
 * yesterday's — internally inconsistent in a way that is invisible until
 * somebody joins two of them.
 *
 * The honest recovery is to fix whatever caused the cancellation and run again,
 * not to assume the warehouse is where it was before.
 *
 * Worth automating for the case that justifies it: a transformation triggered
 * against a sync that turned out to have failed, caught before it finishes.
 */
const action: ActionDefinition = {
  key: "transformation-cancel",
  type: "perform",
  resource: "transformation",
  title: "Cancel a transformation",
  description:
    "Stop a running transformation. Models already built stay built, so the warehouse is left " +
    "internally inconsistent — fix the cause and run again rather than assuming it reverted.",
  idempotent: true,
  params: [
    {
      key: "transformationId",
      label: "Transformation ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [{ key: "cancelled", type: "boolean", label: "The cancellation was accepted" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const transformationId = String(p.transformationId ?? "").trim();
    if (!transformationId) throw new Error("`transformationId` is required");

    ctx.log("warn", "cancelling a Fivetran transformation — models already built stay built", {
      transformationId,
    });
    await new FivetranClient(ctx).request(
      `/v1/transformations/${encodeURIComponent(transformationId)}/cancel`,
      { method: "POST" },
    );
    return { cancelled: true };
  },
};

export default action;
