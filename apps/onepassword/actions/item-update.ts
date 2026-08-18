import type { ActionDefinition } from "@w6w/types";
import { json, OnePasswordClient } from "../lib/client.ts";

/**
 * `PATCH /v1/vaults/{vaultId}/items/{itemId}` — change part of an item.
 *
 * ## Patch, not replace, and the difference destroys data
 *
 * Connect offers both `PUT` and `PATCH`. `PUT` replaces the entire item: any
 * field not present in the request is **deleted**. That is almost never what a
 * rotation workflow means, and the failure is silent — the item still exists,
 * the password is updated, and the username, notes and URLs are gone.
 *
 * This action uses `PATCH` with RFC 6902 JSON Patch operations, which change
 * only what they name. It does not expose `PUT` at all; an item that genuinely
 * needs replacing can be deleted and recreated, which at least looks like what
 * it is.
 *
 * ## The common case is one operation
 *
 * Rotating a password is:
 *
 *     [{"op": "replace", "path": "/fields/<fieldId>/value", "value": "…"}]
 *
 * and `setField` builds exactly that from a field label, because getting the
 * path right by hand is the fiddly part.
 *
 * ## A rotation is not complete until the old credential is revoked
 *
 * Updating the item stores the new value; whatever the old one authenticated
 * against still accepts it. That is outside 1Password's reach and worth saying
 * where somebody automating rotation will read it.
 */
const action: ActionDefinition = {
  key: "item-update",
  type: "perform",
  resource: "item",
  title: "Update an item",
  description:
    "Change part of an item with JSON Patch. This deliberately does not expose the REPLACE " +
    "endpoint, which silently deletes every field the request omits.",
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
      key: "setField",
      label: "Field To Set",
      type: "string",
      default: "",
      hint: "A field label or id — the common case. `password` matches the item's primary " +
        "password by purpose.",
    },
    {
      key: "value",
      label: "New Value",
      type: "secret",
      default: "",
      showIf: { "!=": [{ var: "setField" }, ""] },
    },
    {
      key: "operations",
      label: "Patch Operations",
      type: "json",
      default: "",
      advanced: true,
      hint: 'Raw RFC 6902, e.g. [{"op":"replace","path":"/title","value":"…"}]. Replaces the ' +
        "simple field form entirely.",
    },
  ],
  output: [
    { key: "updated", type: "boolean", label: "Applied" },
    { key: "id", type: "string", label: "The item" },
    { key: "operationCount", type: "number", label: "How many operations were sent" },
  ],

  async execute(input, ctx) {
    const client = new OnePasswordClient(ctx);
    const base = client.requireConnect("item-update");
    const p = input as Record<string, unknown>;
    const vaultId = String(p.vaultId ?? "").trim();
    const itemId = String(p.itemId ?? "").trim();
    if (!vaultId) throw new Error("`vaultId` is required");
    if (!itemId) throw new Error("`itemId` is required");

    const raw = json(p.operations, "operations") as unknown[] | undefined;
    let operations = raw;

    if (!operations) {
      const setField = String(p.setField ?? "").trim();
      if (!setField) throw new Error("give `setField` and `value`, or raw `operations`");
      const value = String(p.value ?? "");

      // Resolve the label to a field id, because the patch path needs the id.
      const item = await client.request<{
        fields?: Array<{ id?: string; label?: string; purpose?: string }>;
      }>(base, `/v1/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}`);
      const fields = item?.fields ?? [];

      const purpose = setField.toUpperCase();
      let matches = purpose === "PASSWORD" || purpose === "USERNAME"
        ? fields.filter((field) => String(field?.purpose ?? "").toUpperCase() === purpose)
        : [];
      if (matches.length === 0) {
        matches = fields.filter((field) =>
          field?.id === setField ||
          String(field?.label ?? "").toLowerCase() === setField.toLowerCase()
        );
      }
      if (matches.length === 0) throw new Error(`no field \`${setField}\` on this item`);
      if (matches.length > 1) {
        throw new Error(
          `${matches.length} fields match \`${setField}\` — use the field's id instead`,
        );
      }

      operations = [{ op: "replace", path: `/fields/${matches[0].id}/value`, value }];
    }

    if (!Array.isArray(operations) || operations.length === 0) {
      throw new Error("`operations` must be a non-empty JSON Patch array");
    }

    await client.request(
      base,
      `/v1/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}`,
      { method: "PATCH", body: operations },
    );

    // The count only — the operations carry the new value.
    ctx.log("info", "patched a 1Password item", { operationCount: operations.length });

    return { updated: true, id: itemId, operationCount: operations.length };
  },
};

export default action;
