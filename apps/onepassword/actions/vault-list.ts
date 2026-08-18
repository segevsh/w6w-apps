import type { ActionDefinition } from "@w6w/types";
import { OnePasswordClient } from "../lib/client.ts";

/**
 * `GET /v1/vaults` — the vaults this token can reach.
 *
 * ## The list *is* the token's scope
 *
 * A Connect token names its vaults at issue time, and this returns exactly
 * those. Nothing else on the server appears — not as an empty entry, not as a
 * permission error. So a vault missing here is not a vault that is missing; it
 * is one this token was not issued for, and the fix is a new token rather than
 * a permission change.
 *
 * That makes this the first thing to run when an item lookup 404s: if the vault
 * is not in this list, the 404 is the scope talking.
 */
const action: ActionDefinition = {
  key: "vault-list",
  type: "read",
  resource: "vault",
  title: "List vaults",
  description:
    "The vaults this token can reach — which IS the token's scope. A vault missing here was " +
    "never granted, and no permission change will add it; only a new token will.",
  params: [],
  output: [
    { key: "vaults", type: "array", label: "Vaults, with ids and item counts" },
    { key: "count", type: "number", label: "How many this token can see" },
    { key: "ids", type: "array", label: "Just the ids" },
  ],

  async execute(_input, ctx) {
    const client = new OnePasswordClient(ctx);
    const base = client.requireConnect("vault-list");

    const vaults = await client.request<
      Array<{ id?: string; name?: string; items?: number }>
    >(base, "/v1/vaults");

    const list = Array.isArray(vaults) ? vaults : [];
    // The count, never the names — a vault name describes what is in it.
    ctx.log("info", "listed 1Password vaults", { count: list.length });

    return {
      vaults: list,
      count: list.length,
      ids: list.map((vault) => vault?.id).filter(Boolean),
    };
  },
};

export default action;
