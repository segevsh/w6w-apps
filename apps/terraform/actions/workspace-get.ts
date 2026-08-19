import type { ActionDefinition } from "@w6w/types";
import { WORKSPACE_PARAMS } from "../lib/params.ts";
import { loadWorkspace, resolveWorkspace } from "../lib/workspaces.ts";

/**
 * One workspace, by id or by organisation and name.
 *
 * ## What to read off it before doing anything else
 *
 * - **`auto-apply`** — whether a successful plan applies itself. Every other
 *   decision in a workflow depends on this one.
 * - **`locked`** and `locked-reason` — a locked workspace queues runs forever.
 * - **`execution-mode`** — `remote` runs in HCP Terraform, `local` means the
 *   API will happily create a run that nothing ever executes, and `agent`
 *   needs an agent pool to be online. A run sitting in `pending` on a `local`
 *   workspace is waiting for something that is never coming.
 * - **`terraform-version`** — pinned, or `latest`, which moves under you.
 * - **`resource-count`** and `updated-at` — how much this workspace manages and
 *   when it last changed.
 */
const action: ActionDefinition = {
  key: "workspace-get",
  type: "read",
  resource: "workspace",
  title: "Get a workspace",
  description: "One workspace, by id or by organisation and name. `auto-apply`, `locked` and " +
    "`execution-mode` are the three attributes that decide whether a run will do anything.",
  params: WORKSPACE_PARAMS,
  output: [
    { key: "workspace", type: "object", label: "The flattened workspace" },
    { key: "id", type: "string", label: "Its id" },
    { key: "name", type: "string", label: "Its name" },
    { key: "autoApply", type: "boolean", label: "Whether a successful plan applies itself" },
    { key: "locked", type: "boolean", label: "Whether runs will queue and never start" },
    { key: "executionMode", type: "string", label: "remote, local or agent" },
    { key: "terraformVersion", type: "string", label: "The pinned version" },
    { key: "resourceCount", type: "number", label: "Resources under management" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ref = await resolveWorkspace(p, ctx);
    const workspace = await loadWorkspace(ref, ctx);

    if (workspace["auto-apply"] === true) {
      ctx.log("warn", "this workspace AUTO-APPLIES — a successful plan changes infrastructure", {
        id: ref.id,
      });
    }

    return {
      workspace,
      id: ref.id,
      name: workspace["name"],
      autoApply: workspace["auto-apply"] === true,
      locked: workspace["locked"] === true,
      executionMode: workspace["execution-mode"],
      terraformVersion: workspace["terraform-version"],
      resourceCount: workspace["resource-count"],
    };
  },
};

export default action;
