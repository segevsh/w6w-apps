import type { HookContext } from "@w6w/types";
import { flatten, TerraformClient } from "./client.ts";

/**
 * Resolving a workspace, which is the small problem every workspace action
 * has.
 *
 * A workspace has an opaque id (`ws-…`) and a name that is unique within its
 * organisation. Both are used: ids come back from other API calls, names are
 * what a person reads off the web interface. `GET /api/v2/organizations/{org}
 * /workspaces/{name}` resolves the second into the first.
 *
 * Requiring the id would mean every workflow starts with a lookup it has to
 * write itself; requiring the name would mean discarding the id an earlier
 * action already returned. So the actions take either.
 */
export interface WorkspaceRef {
  id: string;
  /** Present when the workspace was fetched rather than named by id. */
  workspace?: Record<string, unknown>;
}

export async function resolveWorkspace(
  input: Record<string, unknown>,
  ctx: HookContext,
): Promise<WorkspaceRef> {
  const id = String(input.workspaceId ?? "").trim();
  if (id) {
    if (!/^ws-/.test(id)) {
      throw new Error(
        `\`workspaceId\` should look like "ws-XXXXXXXX" — got "${id}". To address a workspace by ` +
          "name, give `organization` and `workspace` instead",
      );
    }
    return { id };
  }

  const organization = String(input.organization ?? "").trim();
  const name = String(input.workspace ?? "").trim();
  if (!organization || !name) {
    throw new Error(
      "give `workspaceId`, or both `organization` and `workspace` — a workspace name is only " +
        "unique within its organisation",
    );
  }

  const document = await new TerraformClient(ctx).request(
    `/api/v2/organizations/${encodeURIComponent(organization)}/workspaces/${
      encodeURIComponent(name)
    }`,
  );
  const workspace = flatten(document.data as never);
  const resolved = String(workspace?.id ?? "");
  if (!resolved) {
    throw new Error(`could not resolve the workspace "${organization}/${name}"`);
  }
  return { id: resolved, workspace };
}

/**
 * Fetch a workspace by id, whatever it was addressed by.
 *
 * `resolveWorkspace` already has the record when a name was given; this avoids
 * asking for it twice.
 */
export async function loadWorkspace(
  ref: WorkspaceRef,
  ctx: HookContext,
): Promise<Record<string, unknown>> {
  if (ref.workspace) return ref.workspace;
  const document = await new TerraformClient(ctx).request(
    `/api/v2/workspaces/${encodeURIComponent(ref.id)}`,
  );
  return flatten(document.data as never) ?? {};
}
