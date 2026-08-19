import type { ActionDefinition } from "@w6w/types";
import { compact, document, flatten, relatedId, relation, TerraformClient } from "../lib/client.ts";
import { WORKSPACE_PARAMS } from "../lib/params.ts";
import { loadWorkspace, resolveWorkspace } from "../lib/workspaces.ts";

/**
 * `POST /api/v2/runs` — queue a run.
 *
 * ## This is the action that can change infrastructure from one API call
 *
 * A run has two phases. The **plan** works out what would change and is
 * harmless. The **apply** does it. Between them there is normally a
 * confirmation — unless the workspace has `auto-apply` on, in which case a
 * successful plan applies itself and nobody is asked anything.
 *
 * So creating a run against an auto-apply workspace *is* changing
 * infrastructure, from a single call, with no second step to reconsider at.
 * This action therefore:
 *
 * - defaults to **`plan-only`**, which cannot apply under any workspace
 *   setting;
 * - reads the workspace before submitting anything, and **refuses** a
 *   non-plan-only run against an auto-apply workspace without an explicit
 *   acknowledgement;
 * - gates **destroy** runs behind the workspace name typed back.
 *
 * ## A destroy run destroys everything the workspace manages
 *
 * `is-destroy` is not "clean up the thing I changed". It plans the removal of
 * **every resource in the workspace's state** and, applied, deletes them. It
 * is the correct way to decommission an environment and a catastrophic way to
 * fix a drifted resource.
 *
 * ## The workspace goes in `relationships`, not `attributes`
 *
 * JSON:API's shape, and the mistake that produces a 422 that says nothing
 * useful: `{"data": {"type": "runs", "attributes": {…}, "relationships":
 * {"workspace": {"data": {"type": "workspaces", "id": "ws-…"}}}}}`.
 *
 * ## `pending` does not mean it is working
 *
 * A run on a `local` execution-mode workspace, or an `agent` workspace with no
 * agent online, sits in `pending` indefinitely. `workspace-get` reports the
 * mode; a run that never leaves `pending` is usually that, not slowness.
 */
const action: ActionDefinition = {
  key: "run-create",
  type: "perform",
  resource: "run",
  title: "Queue a run",
  description:
    "Queue a plan. Defaults to PLAN-ONLY, which cannot apply — because an ordinary run against " +
    "an auto-apply workspace changes infrastructure from this single call with no confirmation.",
  idempotent: false,
  params: [
    ...WORKSPACE_PARAMS,
    {
      key: "message",
      label: "Message",
      type: "string",
      default: "Queued by a w6w workflow",
      hint: "Shown in the run list. This is what tells a person later which automation did it.",
    },
    {
      key: "planOnly",
      label: "Plan only",
      type: "boolean",
      default: true,
      hint: "On, the run stops after planning and CANNOT apply, whatever the workspace's " +
        "auto-apply setting says.",
    },
    {
      key: "confirmApplyable",
      label: "This run may apply",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "planOnly" }, false] },
      hint: "Required to queue a run that can apply. On an auto-apply workspace, it will — " +
        "without asking anyone.",
    },
    {
      key: "isDestroy",
      label: "Destroy",
      type: "boolean",
      default: false,
      hint: "Plans the removal of EVERY resource in the workspace's state, not just recent " +
        "changes.",
    },
    {
      key: "confirmDestroy",
      label: "Type the workspace name to confirm the destroy",
      type: "string",
      default: "",
      showIf: { "==": [{ var: "isDestroy" }, true] },
    },
    {
      key: "targetAddrs",
      label: "Target Resources",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated resource addresses. Targeting is an escape hatch — it plans against " +
        "part of the configuration, and Terraform's own docs call it a last resort.",
    },
    {
      key: "variables",
      label: "Run Variables",
      type: "json",
      default: "",
      advanced: true,
      hint: 'One-off values for this run only, e.g. [{"key":"region","value":"eu-west-1"}]. They ' +
        "do not persist on the workspace.",
    },
  ],
  output: [
    { key: "run", type: "object", label: "The flattened run" },
    { key: "id", type: "string", label: "The run id — pass it to `run-get`" },
    { key: "status", type: "string", label: "Its status, which starts at pending" },
    { key: "planOnly", type: "boolean", label: "Whether this run can apply at all" },
    { key: "isDestroy", type: "boolean", label: "Whether it plans a full teardown" },
    { key: "willAutoApply", type: "boolean", label: "Whether it applies without being confirmed" },
    { key: "workspaceId", type: "string", label: "The workspace it belongs to" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ref = await resolveWorkspace(p, ctx);
    // Read before writing: whether this call is dangerous is a property of the
    // workspace, not of the parameters.
    const workspace = await loadWorkspace(ref, ctx);
    const name = String(workspace["name"] ?? "");
    const autoApply = workspace["auto-apply"] === true;

    const planOnly = p.planOnly !== false;
    const isDestroy = p.isDestroy === true;

    if (!planOnly && p.confirmApplyable !== true) {
      throw new Error(
        `set \`confirmApplyable\` — this run can apply, and "${name}" ` +
          (autoApply
            ? "has AUTO-APPLY on, so a successful plan will change infrastructure immediately"
            : "will hold it for confirmation, but the run is applyable once queued"),
      );
    }
    if (isDestroy) {
      const confirm = String(p.confirmDestroy ?? "").trim();
      if (confirm !== name) {
        throw new Error(
          `\`confirmDestroy\` must match the workspace name exactly — got "${confirm}" for ` +
            `"${name}". A destroy run plans the removal of every resource in this workspace's ` +
            "state, not just recent changes",
        );
      }
    }

    const targets = String(p.targetAddrs ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const variables = p.variables === undefined || p.variables === ""
      ? undefined
      : typeof p.variables === "string"
      ? JSON.parse(String(p.variables)) as unknown
      : p.variables;
    if (variables !== undefined && !Array.isArray(variables)) {
      throw new Error('`variables` must be an array of {"key","value"} objects');
    }

    const attributes = compact({
      message: String(p.message ?? "").trim() || "Queued by a w6w workflow",
      "target-addrs": targets,
      variables,
    });
    // Both are meaningful when false, and a dropped `plan-only: true` is the
    // dangerous direction — so they are set after compaction, not through it.
    attributes["plan-only"] = planOnly;
    attributes["is-destroy"] = isDestroy;

    const result = await new TerraformClient(ctx).request("/api/v2/runs", {
      method: "POST",
      body: document("runs", attributes, { workspace: relation("workspaces", ref.id) }),
    });
    const run = flatten(result.data as never) ?? {};
    const willAutoApply = autoApply && !planOnly;

    ctx.log(
      willAutoApply || isDestroy ? "warn" : "info",
      isDestroy
        ? "queued a Terraform DESTROY run"
        : willAutoApply
        ? "queued an applyable Terraform run on an auto-apply workspace — it will not be confirmed"
        : "queued a Terraform run",
      { id: run.id, workspaceId: ref.id, planOnly, isDestroy },
    );

    return {
      run,
      id: run.id,
      status: run["status"],
      planOnly,
      isDestroy,
      willAutoApply,
      workspaceId: relatedId(result.data as never, "workspace") ?? ref.id,
    };
  },
};

export default action;
