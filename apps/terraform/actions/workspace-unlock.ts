import type { ActionDefinition } from "@w6w/types";
import { flatten, TerraformClient } from "../lib/client.ts";
import { WORKSPACE_PARAMS } from "../lib/params.ts";
import { resolveWorkspace } from "../lib/workspaces.ts";

/**
 * `POST /api/v2/workspaces/{id}/actions/unlock` — let runs start again.
 *
 * ## Ordinary unlock only releases a lock you hold
 *
 * A workspace locked by another user, or held by a run that is still going,
 * refuses an ordinary unlock with a 409. That is the safety property: releasing
 * somebody else's lock is not something to do by accident.
 *
 * **Force-unlock** (`actions/force-unlock`) overrides that, and it is gated
 * here. It exists for the case a lock outlived whatever took it — an agent that
 * died mid-apply, a run cancelled uncleanly. Using it while an apply is
 * genuinely still running means two applies against one state file, which is
 * the mechanism behind state corruption. Terraform's own documentation is
 * blunt about this and so is the acknowledgement below.
 */
const action: ActionDefinition = {
  key: "workspace-unlock",
  type: "perform",
  resource: "workspace",
  title: "Unlock a workspace",
  description:
    "Release a workspace lock. FORCE overrides a lock held by somebody else or by a running " +
    "apply — two applies against one state file is how state gets corrupted, so it is gated.",
  idempotent: true,
  params: [
    ...WORKSPACE_PARAMS,
    {
      key: "force",
      label: "Force",
      type: "boolean",
      default: false,
      hint: "Overrides a lock held by another user or by a run still in progress.",
    },
    {
      key: "confirmForce",
      label: "The apply that took this lock is definitely not running",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "force" }, true] },
      hint: "Forcing a lock while an apply is genuinely still running means two applies against " +
        "one state file.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "The workspace id" },
    { key: "locked", type: "boolean", label: "Whether it is still locked" },
    { key: "forced", type: "boolean", label: "Whether the lock was overridden" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const force = p.force === true;
    if (force && p.confirmForce !== true) {
      throw new Error(
        "set `confirmForce` — a force-unlock overrides a lock that may belong to an apply still " +
          "in progress, and two applies against one state file is how state gets corrupted",
      );
    }
    const ref = await resolveWorkspace(p, ctx);

    const result = await new TerraformClient(ctx).request(
      `/api/v2/workspaces/${encodeURIComponent(ref.id)}/actions/${
        force ? "force-unlock" : "unlock"
      }`,
      { method: "POST" },
    );
    const workspace = flatten(result.data as never) ?? {};

    if (force) {
      ctx.log("warn", "force-unlocked a Terraform workspace, overriding whoever held the lock", {
        id: ref.id,
      });
    } else {
      ctx.log("info", "unlocked a Terraform workspace", { id: ref.id });
    }

    return {
      id: ref.id,
      locked: workspace["locked"] === true,
      forced: force,
    };
  },
};

export default action;
