import type { ActionDefinition } from "@w6w/types";
import { OnePasswordClient } from "../lib/client.ts";

/**
 * `GET /v1/vaults/{id}` — one vault's metadata.
 *
 * Name, type, item count, and when it last changed. Nothing about the items
 * themselves, and nothing secret.
 *
 * `attributeVersion` and `contentVersion` are the interesting pair: the first
 * changes when the vault itself is renamed or re-shared, the second when its
 * contents change. Watching `contentVersion` is a cheap way to ask "has
 * anything in here moved since I last looked" without listing items at all.
 */
const action: ActionDefinition = {
  key: "vault-get",
  type: "read",
  resource: "vault",
  title: "Get a vault",
  description:
    "One vault's metadata. `contentVersion` changes whenever its contents do, which makes it a " +
    "cheap way to poll for changes without listing items.",
  params: [
    {
      key: "vaultId",
      label: "Vault",
      type: "string",
      required: true,
      default: "",
      hint: "From `vault-list`.",
    },
  ],
  output: [
    { key: "vault", type: "object", label: "The vault" },
    { key: "name", type: "string", label: "Its name" },
    { key: "items", type: "number", label: "How many items it holds" },
    { key: "contentVersion", type: "number", label: "Changes when the contents do" },
  ],

  async execute(input, ctx) {
    const client = new OnePasswordClient(ctx);
    const base = client.requireConnect("vault-get");
    const p = input as Record<string, unknown>;
    const vaultId = String(p.vaultId ?? "").trim();
    if (!vaultId) throw new Error("`vaultId` is required");

    const vault = await client.request<{
      name?: string;
      items?: number;
      contentVersion?: number;
    }>(base, `/v1/vaults/${encodeURIComponent(vaultId)}`);

    return {
      vault,
      name: vault?.name,
      items: vault?.items,
      contentVersion: vault?.contentVersion,
    };
  },
};

export default action;
