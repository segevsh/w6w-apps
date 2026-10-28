import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, seg } from "../lib/client.ts";
import { objectIdParam } from "../lib/params.ts";

interface Input {
  itemId: string;
  newUserPrincipalName?: string;
  autoReconcileProxyConflict?: boolean;
}

/**
 * `POST /directory/deletedItems/{id}/restore`
 *
 * https://learn.microsoft.com/en-us/graph/api/directory-deleteditems-restore?view=graph-rest-1.0
 *
 * Restores a soft-deleted object within its 30-day window; answers `200 OK` with the restored
 * `directoryObject`. The id comes from List Deleted Items. Two optional body fields apply **to
 * users only**: `newUserPrincipalName` (give the restored user a new UPN) and
 * `autoReconcileProxyConflict` (let Entra strip proxy addresses that an active user has since
 * taken). Permissions are per type: restoring a user needs `User.DeleteRestore.All`, a group
 * `Group.ReadWrite.All` (both requested); an application or service principal needs
 * `Application.ReadWrite.All`, which this App does not request, so those restores answer `403`.
 *
 * `idempotent: true`: restoring an already-restored id is a `404` and leaves the same state.
 */
const restoreDeletedItem: ActionDefinition<Input, Record<string, unknown>> = {
  key: "restore-deleted-item",
  type: "perform",
  resource: "deleted-item",
  title: "Restore Deleted Item",
  description: "Restore a soft-deleted user or group within its 30-day window.",
  idempotent: true,
  params: [
    objectIdParam(
      "itemId",
      "Deleted item",
      "The id of the deleted object. Use List Deleted Items.",
    ),
    {
      key: "newUserPrincipalName",
      label: "New user principal name",
      type: "string",
      advanced: true,
      hint: "Users only. Gives the restored user this UPN.",
    },
    {
      key: "autoReconcileProxyConflict",
      label: "Resolve proxy address conflicts",
      type: "boolean",
      advanced: true,
      hint:
        "Users only. Removes proxy addresses that now belong to an active user, instead of failing.",
    },
  ],
  output: [
    { key: "@odata.type", type: "string", label: "Object type" },
    { key: "id", type: "string", label: "Object id" },
    { key: "displayName", type: "string", label: "Display name" },
  ],

  async execute(input, ctx) {
    const body = compact({
      newUserPrincipalName: input.newUserPrincipalName?.trim() || undefined,
      autoReconcileProxyConflict: input.autoReconcileProxyConflict || undefined,
    });
    const client = new GraphClient(ctx);
    ctx.log("info", "restoring deleted item", { itemId: input.itemId });
    return await client.request(`/directory/deletedItems/${seg(input.itemId)}/restore`, {
      method: "POST",
      body: Object.keys(body).length ? body : undefined,
    });
  },
};

export default restoreDeletedItem;
