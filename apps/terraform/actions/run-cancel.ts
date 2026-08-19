import type { ActionDefinition } from "@w6w/types";
import { flatten, TerraformClient } from "../lib/client.ts";

/**
 * `POST /api/v2/runs/{id}/actions/cancel`, or `force-cancel` for the one that
 * does not wait.
 *
 * ## Cancel is polite; force-cancel is not
 *
 * **Cancel** sends the run's process an interrupt and lets Terraform stop at a
 * safe point. If the run is mid-**apply**, that means it finishes the resource
 * it is working on and writes state before stopping — which is the behaviour
 * that keeps state matching reality.
 *
 * **Force-cancel** kills it. State is whatever it was when the process died,
 * which for an interrupted apply means resources that exist and are not in the
 * state file: created, paid for, and invisible to Terraform. Finding them is a
 * manual audit of the provider.
 *
 * HCP Terraform will not even offer force-cancel until an ordinary cancel has
 * been tried and a cool-down has elapsed — `is-force-cancelable` on the run
 * says whether that point has been reached. This action checks it rather than
 * letting the API answer 409, and requires an acknowledgement besides.
 *
 * ## Cancelling a *planning* run is harmless
 *
 * Nothing has been created yet. The dangerous case is specifically a run in
 * `applying`, and this action says which one it is looking at.
 */
const action: ActionDefinition = {
  key: "run-cancel",
  type: "perform",
  resource: "run",
  title: "Cancel a run",
  description:
    "Interrupt a running plan or apply. FORCE kills it instead of stopping safely — an " +
    "interrupted apply leaves resources that exist and are not in the state file.",
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
      default: "Cancelled by a w6w workflow",
    },
    {
      key: "force",
      label: "Force",
      type: "boolean",
      default: false,
      hint: "Only available after an ordinary cancel has been tried and a cool-down has passed.",
    },
    {
      key: "confirmForce",
      label: "I accept that state may not match reality afterwards",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "force" }, true] },
      hint: "A force-cancelled APPLY leaves resources created but unrecorded. Finding them is a " +
        "manual audit of the cloud provider.",
    },
  ],
  output: [
    { key: "cancelled", type: "boolean", label: "Whether the cancel was accepted" },
    { key: "id", type: "string", label: "The run id" },
    { key: "status", type: "string", label: "The status before cancelling" },
    { key: "forced", type: "boolean", label: "Whether it was killed rather than interrupted" },
    { key: "wasApplying", type: "boolean", label: "Whether it was mid-apply — the risky case" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.runId ?? "").trim();
    if (!id) throw new Error("`runId` is required");
    const force = p.force === true;
    if (force && p.confirmForce !== true) {
      throw new Error(
        "set `confirmForce` — a force-cancel kills the run rather than stopping it safely, and " +
          "an interrupted apply leaves resources that exist and are not in the state file",
      );
    }

    const client = new TerraformClient(ctx);
    const before = await client.request(`/api/v2/runs/${encodeURIComponent(id)}`);
    const run = flatten(before.data as never) ?? {};
    const status = String(run["status"] ?? "");
    const wasApplying = status === "applying";

    if (force && run["is-force-cancelable"] !== true) {
      throw new Error(
        "this run is not force-cancelable yet — HCP Terraform requires an ordinary cancel first " +
          "and a cool-down after it. Cancel without `force`, wait, then try again",
      );
    }

    await client.request(
      `/api/v2/runs/${encodeURIComponent(id)}/actions/${force ? "force-cancel" : "cancel"}`,
      {
        method: "POST",
        body: { comment: String(p.comment ?? "").trim() || "Cancelled by a w6w workflow" },
      },
    );

    ctx.log(
      force && wasApplying ? "warn" : "info",
      force && wasApplying
        ? "force-cancelled a Terraform APPLY — state may no longer match reality"
        : force
        ? "force-cancelled a Terraform run"
        : "cancelled a Terraform run",
      { id, status },
    );

    return { cancelled: true, id, status, forced: force, wasApplying };
  },
};

export default action;
