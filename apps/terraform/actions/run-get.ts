import type { ActionDefinition } from "@w6w/types";
import { flatten, relatedId, resolve, TerraformClient } from "../lib/client.ts";

/**
 * `GET /api/v2/runs/{id}?include=plan,apply,workspace` — where a run has got
 * to.
 *
 * ## The status vocabulary is large, and three of the values mean "waiting for
 * a person"
 *
 * A run passes through `pending` → `planning` → `planned` → `applying` →
 * `applied`. It can also stop at:
 *
 * - **`planned_and_finished`** — the plan found **no changes**, or the run was
 *   plan-only. This is a *success*, and a workflow polling for `applied` waits
 *   for a state that will never come. It is the most common way a
 *   wait-for-completion loop hangs.
 * - **`planned`** — waiting for somebody to confirm the apply. Also terminal
 *   without intervention.
 * - **`policy_override`** — a Sentinel policy soft-failed and needs an
 *   override.
 * - **`cost_estimated`** — an extra phase that only exists when the
 *   organisation has cost estimation on.
 *
 * So this action reports `finished` and `awaitingDecision` alongside the raw
 * status, because "is this run done" is not answerable by comparing to one
 * value.
 *
 * ## `include` sideloads, and this joins it back
 *
 * `?include=plan` does not nest the plan inside the run — it appends a
 * top-level `included` array while the run keeps a `{type, id}` pointer.
 * Reading `run.plan.resource-additions` on the raw response gets `undefined`
 * from a document that contains the number.
 */

/** Statuses from which the run will not move without a person acting. */
export const AWAITING_DECISION = new Set([
  "planned",
  "policy_override",
  "post_plan_awaiting_decision",
  "confirmed",
]);

/** Statuses the run will not leave at all. */
export const FINISHED = new Set([
  "applied",
  "planned_and_finished",
  "discarded",
  "errored",
  "canceled",
  "force_canceled",
]);

const action: ActionDefinition = {
  key: "run-get",
  type: "read",
  resource: "run",
  title: "Get a run",
  description:
    "A run's status and its plan's resource counts. `planned_and_finished` is a SUCCESS with no " +
    "changes — a loop waiting for `applied` hangs on it forever.",
  params: [
    {
      key: "runId",
      label: "Run ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "run-XXXXXXXXXXXXXXXX",
    },
  ],
  output: [
    { key: "run", type: "object", label: "The flattened run" },
    { key: "id", type: "string", label: "Its id" },
    { key: "status", type: "string", label: "The raw status" },
    { key: "finished", type: "boolean", label: "Whether it will move again on its own" },
    { key: "awaitingDecision", type: "boolean", label: "Whether it is waiting for a person" },
    { key: "hasChanges", type: "boolean", label: "Whether the plan found anything to do" },
    { key: "adds", type: "number", label: "Resources the plan would add" },
    { key: "changes", type: "number", label: "Resources it would change" },
    { key: "destroys", type: "number", label: "Resources it would DESTROY" },
    { key: "plan", type: "object", label: "The sideloaded plan, joined back on" },
    { key: "workspaceId", type: "string", label: "The workspace it belongs to" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.runId ?? "").trim();
    if (!id) throw new Error("`runId` is required");

    const document = await new TerraformClient(ctx).request(
      `/api/v2/runs/${encodeURIComponent(id)}`,
      { query: { include: "plan,apply,workspace" } },
    );
    const raw = document.data as never;
    const run = flatten(raw) ?? {};
    // The plan is a sibling in `included`, not a child of the run.
    const plan = resolve(raw, "plan", document.included);

    const status = String(run["status"] ?? "");
    const destroys = Number(plan?.["resource-destructions"] ?? 0);

    if (destroys > 0) {
      ctx.log("warn", "this Terraform plan destroys resources", { id, destroys });
    }

    return {
      run,
      id: run.id,
      status,
      finished: FINISHED.has(status),
      awaitingDecision: AWAITING_DECISION.has(status),
      hasChanges: run["has-changes"] === true,
      adds: Number(plan?.["resource-additions"] ?? 0),
      changes: Number(plan?.["resource-changes"] ?? 0),
      destroys,
      plan,
      workspaceId: relatedId(raw, "workspace"),
    };
  },
};

export default action;
