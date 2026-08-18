import type { ActionDefinition } from "@w6w/types";
import { isSecretField, type ItemField, OnePasswordClient, redactFields } from "../lib/client.ts";

/**
 * `GET /v1/vaults/{vaultId}/items/{itemId}` — one item, in full.
 *
 * ## This is the action that can read a secret, so it does not do it by accident
 *
 * The endpoint returns every field including passwords, tokens and keys. This
 * action **redacts them by default**: it returns the item's structure — which
 * fields exist, what they are called, what type they are, whether a value is
 * set — with the values of concealed fields replaced by `[redacted]`.
 *
 * That is enough for most of what a workflow wants: checking an item exists,
 * reading its URL or username, seeing whether a password has been set, listing
 * what a credential record contains. None of it needs the secret.
 *
 * Reading an actual value is then a deliberate act, and there are two ways to
 * make it:
 *
 * - **`revealSecrets`** on this action, which returns everything.
 * - **`item-field-get`**, which returns exactly one named field — the better
 *   choice when a workflow needs one password, because the rest never enters
 *   the run's data at all.
 *
 * ## What is treated as secret
 *
 * `CONCEALED` fields, plus `OTP`, `SSHKEY` and `CREDIT_CARD_NUMBER`, plus
 * anything marked `purpose: PASSWORD` whatever its declared type. The last of
 * those matters: a password field can be typed `STRING` and still be the
 * password.
 */
const action: ActionDefinition = {
  key: "item-get",
  type: "read",
  resource: "item",
  title: "Get an item",
  description:
    "One item's fields. Secret values are REDACTED by default — the structure comes back so a " +
    "workflow can see what exists without the run carrying the secret.",
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
      hint: "From `item-list`.",
    },
    {
      key: "revealSecrets",
      label: "Include Secret Values",
      type: "boolean",
      default: false,
      hint: "Off returns the item's shape with concealed values replaced. On returns everything, " +
        "and the whole item — every password on it — becomes part of this run's data. For one " +
        "credential, `item-field-get` is narrower.",
    },
  ],
  output: [
    { key: "item", type: "object", label: "The item, redacted unless asked otherwise" },
    { key: "title", type: "string", label: "Its title" },
    { key: "category", type: "string", label: "LOGIN, API_CREDENTIAL, DATABASE, …" },
    { key: "fieldLabels", type: "array", label: "What fields exist, by label" },
    { key: "secretFieldCount", type: "number", label: "How many fields hold a secret" },
    { key: "redacted", type: "boolean", label: "Whether values were withheld" },
  ],

  async execute(input, ctx) {
    const client = new OnePasswordClient(ctx);
    const base = client.requireConnect("item-get");
    const p = input as Record<string, unknown>;
    const vaultId = String(p.vaultId ?? "").trim();
    const itemId = String(p.itemId ?? "").trim();
    if (!vaultId) throw new Error("`vaultId` is required");
    if (!itemId) throw new Error("`itemId` is required");

    const item = await client.request<{
      title?: string;
      category?: string;
      fields?: ItemField[];
    }>(
      base,
      `/v1/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}`,
    );

    const fields = item?.fields ?? [];
    const reveal = p.revealSecrets === true;
    const secretFieldCount = fields.filter(isSecretField).length;

    if (reveal) {
      ctx.log("warn", "read a 1Password item WITH its secret values", {
        secretFieldCount,
        // Never the title: it names what the secret is for.
        category: item?.category,
      });
    } else {
      ctx.log("info", "read a 1Password item, secrets redacted", { secretFieldCount });
    }

    return {
      item: reveal ? item : { ...item, fields: redactFields(fields) },
      title: item?.title,
      category: item?.category,
      // The labels are safe and are usually what a caller actually needed.
      fieldLabels: fields.map((field) => field?.label).filter(Boolean),
      secretFieldCount,
      redacted: !reveal,
    };
  },
};

export default action;
