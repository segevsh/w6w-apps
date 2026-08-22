import type { ActionDefinition } from "@w6w/types";
import { TerraformClient } from "../lib/client.ts";
import { WORKSPACE_PARAMS } from "../lib/params.ts";
import { loadWorkspace, resolveWorkspace } from "../lib/workspaces.ts";

/**
 * `POST /api/v2/workspaces/{id}/actions/safe-delete`, or `DELETE` for the
 * unsafe one.
 *
 * ## Deleting a workspace does not delete the infrastructure
 *
 * This is the thing to understand before running it. The workspace, its state
 * history and its run history go. The **resources those state files describe
 * stay exactly where they are** — the servers keep running, the buckets keep
 * existing, the bill keeps arriving — and nothing is left that knows they were
 * ever managed by Terraform. They become orphans, and reconstructing that is
 * an import job per resource.
 *
 * To remove the infrastructure, queue a **destroy run** first (`run-create`
 * with `isDestroy`), let it finish, and only then delete the workspace.
 *
 * ## Safe delete is the default, and it refuses when it matters
 *
 * `actions/safe-delete` returns **409** when the workspace still manages
 * resources, which is exactly the case where deleting orphans them. The plain
 * `DELETE` does not check. This action uses safe-delete unless told otherwise,
 * and the unsafe path needs the workspace name typed back.
 */
const action: ActionDefinition = {
  key: "workspace-delete",
  type: "perform",
  resource: "workspace",
  title: "Delete a workspace",
  description:
    "Remove a workspace and its state history. The INFRASTRUCTURE IS NOT DELETED — it keeps " +
    "running, unmanaged and unrecorded. Queue a destroy run first if that is the intent.",
  idempotent: true,
  params: [
    ...WORKSPACE_PARAMS,
    {
      key: "force",
      label: "Delete even if it still manages resources",
      type: "boolean",
      default: false,
      hint: "Off, this uses safe-delete, which refuses with a 409 while resources exist — the " +
        "exact case where deleting orphans them.",
    },
    {
      key: "confirmName",
      label: "Type the workspace name again",
      type: "string",
      default: "",
      showIf: { "==": [{ var: "force" }, true] },
      hint: "Required for a forced delete. The state history goes with it and there is no undo.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Removed" },
    { key: "id", type: "string", label: "The workspace id" },
    { key: "name", type: "string", label: "Its name" },
    { key: "forced", type: "boolean", label: "Whether the resource check was skipped" },
    { key: "resourceCount", type: "number", label: "What it was managing when deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const force = p.force === true;
    const ref = await resolveWorkspace(p, ctx);
    const workspace = await loadWorkspace(ref, ctx);
    const name = String(workspace["name"] ?? "");
    const resourceCount = Number(workspace["resource-count"] ?? 0);

    if (force) {
      const confirm = String(p.confirmName ?? "").trim();
      if (!confirm || confirm !== name) {
        throw new Error(
          `\`confirmName\` must match the workspace name exactly — got "${confirm}" for ` +
            `"${name}". A forced delete skips the resource check, and ${resourceCount} ` +
            "resources would be left running with nothing managing them",
        );
      }
    }

    const client = new TerraformClient(ctx);
    if (force) {
      await client.request(`/api/v2/workspaces/${encodeURIComponent(ref.id)}`, {
        method: "DELETE",
      });
      ctx.log(
        "warn",
        "force-deleted a Terraform workspace — any resources it managed are now unmanaged",
        { id: ref.id, resourceCount },
      );
    } else {
      // 409 while resources exist, which is the whole point of this path.
      await client.request(
        `/api/v2/workspaces/${encodeURIComponent(ref.id)}/actions/safe-delete`,
        { method: "POST" },
      );
      ctx.log("warn", "deleted a Terraform workspace", { id: ref.id, resourceCount });
    }

    return { deleted: true, id: ref.id, name, forced: force, resourceCount };
  },
};

export default action;
