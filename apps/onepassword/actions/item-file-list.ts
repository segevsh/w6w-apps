import type { ActionDefinition } from "@w6w/types";
import { OnePasswordClient } from "../lib/client.ts";

/**
 * `GET /v1/vaults/{vaultId}/items/{itemId}/files` — the files attached to an
 * item.
 *
 * ## Where certificates and private keys actually live
 *
 * A TLS certificate, a service-account JSON, an SSH private key, a keystore —
 * none of these fit in a text field, and all of them are secrets. They are
 * stored as attachments, which means an app that reads only fields cannot see
 * half of what a credentials vault holds.
 *
 * ## Listing is safe; the content is a separate request
 *
 * This returns names, sizes and ids. The bytes require
 * `item-file-get`, deliberately — the same separation `item-get` makes for
 * field values, for the same reason.
 */
const action: ActionDefinition = {
  key: "item-file-list",
  type: "read",
  resource: "file",
  title: "List an item's files",
  description:
    "Attachments on an item — where certificates and private keys live, since they do not fit " +
    "in a field. Listing is safe; the bytes are a separate request.",
  params: [
    { key: "vaultId", label: "Vault", type: "string", required: true, default: "" },
    { key: "itemId", label: "Item", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "files", type: "array", label: "Files, with names, sizes and ids" },
    { key: "count", type: "number", label: "How many" },
    { key: "totalBytes", type: "number", label: "Their combined size" },
  ],

  async execute(input, ctx) {
    const client = new OnePasswordClient(ctx);
    const base = client.requireConnect("item-file-list");
    const p = input as Record<string, unknown>;
    const vaultId = String(p.vaultId ?? "").trim();
    const itemId = String(p.itemId ?? "").trim();
    if (!vaultId) throw new Error("`vaultId` is required");
    if (!itemId) throw new Error("`itemId` is required");

    const files = await client.request<Array<{ id?: string; name?: string; size?: number }>>(
      base,
      `/v1/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}/files`,
    );

    const list = Array.isArray(files) ? files : [];
    // Counts only — a filename names what the key is for.
    ctx.log("info", "listed 1Password item files", { count: list.length });

    return {
      files: list,
      count: list.length,
      totalBytes: list.reduce((sum, file) => sum + Number(file?.size ?? 0), 0),
    };
  },
};

export default action;
