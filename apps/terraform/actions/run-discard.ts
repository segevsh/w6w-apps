import type { ActionDefinition } from "@w6w/types";
import { flatten, TerraformClient } from "../lib/client.ts";

/**
 * `POST /api/v2/runs/{id}/actions/discard` — throw a planned run away.
 *
 * ## Discarding is how a queue gets unblocked
 *
 * A run sitting in `planned` holds its workspace: every run queued behind it
 * waits. Discarding says "this plan will not be applied", releases the
 * workspace, and lets the next one start. It changes **no infrastructure** —
 * the plan was only ever a proposal.
 *
 * This is therefore the safe half of the pair with `run-apply`, and the right
 * response to a plan that turned out to be wrong, a run queued by mistake, or
 * an automation that timed out waiting for approval.
 *
 * ## It also discards everything queued behind it
 *
 * The one thing to know: discarding a run **also discards any runs queued
 * after it in the same workspace**, because their plans were computed against
 * a state this one would have changed. Terraform says so in the confirmation
 * dialog of its own interface; the API just does it.
 */
const action: ActionDefinition = {
  key: "run-discard",
  type: "perform",
  resource: "run",
  title: "Discard a run",
  description:
    "Throw away a planned run without applying it — this changes no infrastructure. It ALSO " +
    "discards any runs queued behind it in the same workspace.",
  idempotent: true,
  params: [
    {
      key: "runId",
      label: "Run ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "run-XXXXXXXXXXXXXXXX",
    },
    {
      key: "comment",
      label: "Comment",
      type: "string",
      default: "Discarded by a w6w workflow",
    },
  ],
  output: [
    { key: "discarded", type: "boolean", label: "Whether it was discarded" },
    { key: "id", type: "string", label: "The run id" },
    { key: "status", type: "string", label: "The status before discarding" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.runId ?? "").trim();
    if (!id) throw new Error("`runId` is required");

    const client = new TerraformClient(ctx);
    const before = await client.request(`/api/v2/runs/${encodeURIComponent(id)}`);
    const status = String((flatten(before.data as never) ?? {})["status"] ?? "");

    await client.request(`/api/v2/runs/${encodeURIComponent(id)}/actions/discard`, {
      method: "POST",
      body: { comment: String(p.comment ?? "").trim() || "Discarded by a w6w workflow" },
    });

    ctx.log("info", "discarded a Terraform run, releasing its workspace", { id, status });

    return { discarded: true, id, status };
  },
};

export default action;
