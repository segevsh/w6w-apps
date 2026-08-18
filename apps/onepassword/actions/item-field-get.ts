import type { ActionDefinition } from "@w6w/types";
import { isSecretField, type ItemField, OnePasswordClient } from "../lib/client.ts";

/**
 * Fetch exactly one field's value — the narrow way to read a secret.
 *
 * ## Why this exists alongside `item-get`
 *
 * A workflow that needs a database password needs *that password*, not the
 * whole record it lives in. `item-get` with `revealSecrets` would put every
 * field of the item — the username, the connection string, any other passwords
 * on it — into the run's data, where it will be carried through subsequent
 * steps and may be logged by something downstream that has no idea what it is
 * holding.
 *
 * This returns one named field and nothing else. It is the action to reach for
 * whenever the answer to "what do you actually need" is a single value.
 *
 * ## Matching is by label or id, and labels are not unique
 *
 * 1Password lets two fields share a label. Where that happens this refuses
 * rather than picking one, because picking silently is how a workflow ends up
 * using the wrong credential — and the item will look right.
 *
 * ## `purpose` is the reliable way to find the password
 *
 * A login item's primary password carries `purpose: PASSWORD` regardless of its
 * label, which may be localised or renamed. `password` and `username` are
 * accepted as shorthands for the purposes rather than the labels.
 */
const action: ActionDefinition = {
  key: "item-field-get",
  type: "read",
  resource: "item",
  title: "Get one field's value",
  description:
    "Fetch a single field — the narrow way to read a secret. The rest of the item never enters " +
    "the run's data, which `item-get` with reveal cannot avoid.",
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
      key: "field",
      label: "Field",
      type: "string",
      required: true,
      default: "password",
      hint: "A field label, a field id, or `password`/`username` for the item's primary ones — " +
        "those match on `purpose`, which survives a renamed or localised label.",
    },
  ],
  output: [
    { key: "value", type: "string", label: "The field's value" },
    { key: "label", type: "string", label: "Which field answered" },
    { key: "type", type: "string", label: "Its type" },
    { key: "isSecret", type: "boolean", label: "Whether this value is a concealed one" },
  ],

  async execute(input, ctx) {
    const client = new OnePasswordClient(ctx);
    const base = client.requireConnect("item-field-get");
    const p = input as Record<string, unknown>;
    const vaultId = String(p.vaultId ?? "").trim();
    const itemId = String(p.itemId ?? "").trim();
    const wanted = String(p.field ?? "").trim();
    if (!vaultId) throw new Error("`vaultId` is required");
    if (!itemId) throw new Error("`itemId` is required");
    if (!wanted) throw new Error("`field` is required");

    const item = await client.request<{ fields?: ItemField[] }>(
      base,
      `/v1/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}`,
    );
    const fields = item?.fields ?? [];

    // `purpose` survives a renamed or localised label, so it is tried first.
    const purpose = wanted.toUpperCase();
    let matches = purpose === "PASSWORD" || purpose === "USERNAME"
      ? fields.filter((field) => String(field?.purpose ?? "").toUpperCase() === purpose)
      : [];

    if (matches.length === 0) {
      matches = fields.filter((field) =>
        field?.id === wanted ||
        String(field?.label ?? "").toLowerCase() === wanted.toLowerCase()
      );
    }

    if (matches.length === 0) {
      const available = fields.map((field) => field?.label).filter(Boolean);
      throw new Error(
        `no field \`${wanted}\` on this item. It has: ${
          available.length ? available.join(", ") : "no labelled fields"
        }`,
      );
    }
    if (matches.length > 1) {
      // Picking one silently is how the wrong credential gets used.
      throw new Error(
        `${matches.length} fields on this item match \`${wanted}\` — 1Password allows duplicate ` +
          "labels. Use the field's id instead, which `item-get` lists",
      );
    }

    const field = matches[0];
    const secret = isSecretField(field);

    // The label and whether it was secret — never the value, and never the
    // item's title, which names what the secret is for.
    ctx.log("info", "read one 1Password field", { label: field?.label, isSecret: secret });

    return {
      value: field?.value ?? field?.totp,
      label: field?.label,
      type: field?.type,
      isSecret: secret,
    };
  },
};

export default action;
