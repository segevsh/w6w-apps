import type { ActionDefinition } from "@w6w/types";
import { OnePasswordClient } from "../lib/client.ts";

/**
 * `GET /v1/vaults/{id}/items` — the items in a vault.
 *
 * ## This never returns secrets, by design
 *
 * The list endpoint returns item *summaries*: id, title, category, tags,
 * timestamps, and the URLs a login is for. It does **not** include field
 * values, whatever they are — fetching a secret always takes a second,
 * specific request for one item. That is 1Password's design and it is a good
 * one, so this action does not paper over it.
 *
 * ## The filter is SCIM syntax
 *
 * `filter=title eq "Production database"`. Not SQL, not a query string, and
 * not case-insensitive — SCIM's `eq` is exact. There is no `contains`, so
 * finding an item by partial name means listing the vault and filtering here,
 * which this action does with `titleContains`.
 */
const action: ActionDefinition = {
  key: "item-list",
  type: "search",
  resource: "item",
  title: "List items",
  description:
    "Items in a vault, as summaries — this endpoint NEVER returns field values, whatever they " +
    "are. Reading a secret always takes a second request for one item.",
  params: [
    {
      key: "vaultId",
      label: "Vault",
      type: "string",
      required: true,
      default: "",
      hint: "From `vault-list`.",
    },
    {
      key: "title",
      label: "Exact Title",
      type: "string",
      default: "",
      hint: "An exact, case-sensitive match, sent as a SCIM `title eq` filter. 1Password has no " +
        "`contains`.",
    },
    {
      key: "titleContains",
      label: "Title Contains",
      type: "string",
      default: "",
      hint: "A substring match, applied here after listing the vault — because the API cannot do " +
        "it.",
    },
    {
      key: "category",
      label: "Category",
      type: "string",
      default: "",
      placeholder: "LOGIN",
      hint: "`LOGIN`, `PASSWORD`, `API_CREDENTIAL`, `DATABASE`, `SECURE_NOTE`, `SSH_KEY`.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Item summaries — no field values" },
    { key: "count", type: "number", label: "How many matched" },
    { key: "total", type: "number", label: "How many the vault holds" },
    { key: "ids", type: "array", label: "Just the ids" },
  ],

  async execute(input, ctx) {
    const client = new OnePasswordClient(ctx);
    const base = client.requireConnect("item-list");
    const p = input as Record<string, unknown>;
    const vaultId = String(p.vaultId ?? "").trim();
    if (!vaultId) throw new Error("`vaultId` is required");

    const title = String(p.title ?? "").trim();
    const items = await client.request<Array<{ id?: string; title?: string; category?: string }>>(
      base,
      `/v1/vaults/${encodeURIComponent(vaultId)}/items`,
      // SCIM syntax, and `eq` is exact — a quote in the value would break it.
      { query: title ? { filter: `title eq "${title.replace(/"/g, "")}"` } : {} },
    );

    const all = Array.isArray(items) ? items : [];
    let matched = all;

    const contains = String(p.titleContains ?? "").trim().toLowerCase();
    if (contains) {
      matched = matched.filter((item) =>
        String(item?.title ?? "").toLowerCase().includes(contains)
      );
    }
    const category = String(p.category ?? "").trim().toUpperCase();
    if (category) {
      matched = matched.filter((item) => String(item?.category ?? "").toUpperCase() === category);
    }

    // Counts only — an item title names the thing the secret is for.
    ctx.log("info", "listed 1Password items", { count: matched.length, total: all.length });

    return {
      items: matched,
      count: matched.length,
      total: all.length,
      ids: matched.map((item) => item?.id).filter(Boolean),
    };
  },
};

export default action;
