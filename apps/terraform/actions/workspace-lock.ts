import type { ActionDefinition } from "@w6w/types";
import { document, flatten, TerraformClient } from "../lib/client.ts";
import { WORKSPACE_PARAMS } from "../lib/params.ts";
import { resolveWorkspace } from "../lib/workspaces.ts";

/**
 * `POST /api/v2/workspaces/{id}/actions/lock` — stop runs from starting.
 *
 * ## A lock is a queue, not a refusal
 *
 * Locking does not make run creation fail. Runs are still accepted, and they
 * sit in `pending` until somebody unlocks the workspace. So a workflow that
 * creates a run against a locked workspace succeeds, gets an id back, and then
 * waits for a state that will not arrive on its own.
 *
 * That makes locking the right tool for a maintenance window — and a
 * forgotten lock the reason "nothing has deployed since Tuesday".
 *
 * ## The reason is the only thing another person will see
 *
 * `locked-reason` is what appears in the interface next to the padlock. An
 * automation locking a workspace without one leaves a workspace nobody can
 * explain, which is how a lock survives for a week.
 *
 * ## Locking an already-locked workspace is a 409
 *
 * Not a no-op. The error says which run or user holds it.
 */
const action: ActionDefinition = {
  key: "workspace-lock",
  type: "perform",
  resource: "workspace",
  title: "Lock a workspace",
  description:
    "Stop runs from starting. Runs are still ACCEPTED — they queue in `pending` — so a workflow " +
    "creating one against a locked workspace waits for a state that never arrives.",
  idempotent: false,
  params: [
    ...WORKSPACE_PARAMS,
    {
      key: "reason",
      label: "Reason",
      type: "string",
      required: true,
      default: "",
      hint: "Shown beside the padlock in the interface. Without one, nobody can tell whether the " +
        "lock is still needed.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "The workspace id" },
    { key: "locked", type: "boolean", label: "Whether it is now locked" },
    { key: "reason", type: "string", label: "The recorded reason" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const reason = String(p.reason ?? "").trim();
    if (!reason) {
      throw new Error(
        "`reason` is required — a lock with no reason is one nobody else can decide to release",
      );
    }
    const ref = await resolveWorkspace(p, ctx);

    const result = await new TerraformClient(ctx).request(
      `/api/v2/workspaces/${encodeURIComponent(ref.id)}/actions/lock`,
      { method: "POST", body: document("workspaces", { reason }) },
    );
    const workspace = flatten(result.data as never) ?? {};

    ctx.log("warn", "locked a Terraform workspace — runs will queue until it is unlocked", {
      id: ref.id,
    });

    return {
      id: ref.id,
      locked: workspace["locked"] === true,
      reason: workspace["locked-reason"] ?? reason,
    };
  },
};

export default action;
