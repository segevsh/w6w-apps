import type { ActionDefinition } from "@w6w/types";
import { OnePasswordClient } from "../lib/client.ts";

/**
 * `DELETE /v1/vaults/{vaultId}/items/{itemId}` — remove an item.
 *
 * ## It goes to the Archive, not to nothing
 *
 * 1Password archives deleted items rather than destroying them, and an account
 * administrator can restore one from the web interface. So this is recoverable,
 * which is a genuinely better position than most delete endpoints in this pack.
 *
 * What it is *not* is instant across every client: a device that is offline
 * keeps its copy until it syncs. That matters for a credential being rotated
 * because it was leaked — deleting the item does not un-cache it anywhere.
 *
 * ## Deleting the record does not revoke the secret
 *
 * The credential the item held still works wherever it was valid. Deletion is
 * bookkeeping; revocation happens at whatever issued the secret, and only that
 * makes it stop working.
 *
 * The confirmation here asks for the item id again, because a workflow
 * parameter with the wrong id deletes the wrong credential and the failure
 * surfaces when something else stops working, hours later.
 */
const action: ActionDefinition = {
  key: "item-delete",
  type: "perform",
  resource: "item",
  title: "Delete an item",
  description:
    "Move an item to the Archive, where an administrator can restore it. It does NOT revoke the " +
    "credential — that happens wherever the secret was issued.",
  idempotent: true,
  params: [
    {
      key: "vaultId",
      label: "Vault",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "itemId",
      label: "Item",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "confirmItemId",
      label: "Type the item id again",
      type: "string",
      required: true,
      default: "",
      hint: "Must match exactly. A wrong id here deletes somebody else's credential, and nothing " +
        "notices until whatever used it stops working.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Archived" },
    { key: "itemId", type: "string", label: "What was archived" },
  ],

  async execute(input, ctx) {
    const client = new OnePasswordClient(ctx);
    const base = client.requireConnect("item-delete");
    const p = input as Record<string, unknown>;
    const vaultId = String(p.vaultId ?? "").trim();
    const itemId = String(p.itemId ?? "").trim();
    if (!vaultId) throw new Error("`vaultId` is required");
    if (!itemId) throw new Error("`itemId` is required");

    const confirm = String(p.confirmItemId ?? "").trim();
    if (confirm !== itemId) {
      throw new Error(
        `\`confirmItemId\` must match the item id exactly — got "${confirm}" for "${itemId}". ` +
          "Deleting the wrong credential surfaces hours later, when something else stops working",
      );
    }

    await client.request(
      base,
      `/v1/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}`,
      { method: "DELETE" },
    );

    ctx.log("warn", "archived a 1Password item — the credential itself is not revoked", {
      itemId,
    });
    return { deleted: true, itemId };
  },
};

export default action;
