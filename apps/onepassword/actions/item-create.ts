import type { ActionDefinition } from "@w6w/types";
import { compact, json, OnePasswordClient } from "../lib/client.ts";

/**
 * `POST /v1/vaults/{vaultId}/items` — store a new secret.
 *
 * ## What this is for
 *
 * Storing a credential a workflow just produced: a rotated API key, a generated
 * password, a token issued by another system. Putting it in 1Password rather
 * than a variable is the difference between a secret that is managed and one
 * that is somewhere.
 *
 * ## The category decides the shape, and it cannot be changed later
 *
 * `LOGIN` expects a username and password; `API_CREDENTIAL` expects a
 * credential and a hostname; `DATABASE` expects a server, port and database
 * name. 1Password will accept fields that do not fit the category, and the item
 * then displays oddly in every client forever. `category` is not editable after
 * creation — only delete and recreate.
 *
 * ## A concealed field is what makes a value a secret
 *
 * `type: "CONCEALED"` is what causes 1Password to hide the value, exclude it
 * from search, and audit reads of it. A password stored as `STRING` is stored
 * in plain sight in the UI and is not treated as sensitive anywhere. So the
 * field type is not cosmetic, and this action defaults new value fields to
 * concealed rather than the other way round.
 */
const action: ActionDefinition = {
  key: "item-create",
  type: "perform",
  resource: "item",
  title: "Create an item",
  description:
    "Store a new secret — a rotated key, a generated password. Field TYPE is what makes a value " +
    "secret: `CONCEALED` is hidden and audited, `STRING` is neither.",
  idempotent: false,
  params: [
    {
      key: "vaultId",
      label: "Vault",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      default: "",
      hint: "What this credential is for. Searchable, and visible to everyone with the vault.",
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      required: true,
      default: "LOGIN",
      options: [
        { value: "LOGIN", label: "Login — username and password" },
        { value: "PASSWORD", label: "Password — a value on its own" },
        { value: "API_CREDENTIAL", label: "API Credential" },
        { value: "DATABASE", label: "Database" },
        { value: "SECURE_NOTE", label: "Secure Note" },
        { value: "SERVER", label: "Server" },
        { value: "SSH_KEY", label: "SSH Key" },
      ],
      hint: "Fixed at creation — changing it later means deleting and recreating.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      default: "",
      hint: 'A JSON array, e.g. [{"label":"password","value":"…"},{"label":"username",' +
        '"value":"…","type":"STRING"}]. Fields default to CONCEALED unless a type is given.',
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      hint: "Comma-separated. The practical way to find items a workflow created.",
    },
    {
      key: "urls",
      label: "URLs",
      type: "json",
      default: "",
      advanced: true,
      hint: 'e.g. [{"href":"https://example.com","primary":true}].',
    },
  ],
  output: [
    { key: "id", type: "string", label: "The new item's id" },
    { key: "title", type: "string", label: "Its title" },
    { key: "vaultId", type: "string", label: "Where it went" },
    { key: "fieldCount", type: "number", label: "Fields stored" },
    { key: "concealedCount", type: "number", label: "How many are actually treated as secret" },
  ],

  async execute(input, ctx) {
    const client = new OnePasswordClient(ctx);
    const base = client.requireConnect("item-create");
    const p = input as Record<string, unknown>;
    const vaultId = String(p.vaultId ?? "").trim();
    const title = String(p.title ?? "").trim();
    if (!vaultId) throw new Error("`vaultId` is required");
    if (!title) throw new Error("`title` is required");

    const parsed = json(p.fields, "fields");
    const fields = (Array.isArray(parsed) ? parsed : []) as Array<Record<string, unknown>>;
    if (fields.length === 0) throw new Error("`fields` must contain at least one field");

    // Concealed unless the caller says otherwise: a value stored as STRING is
    // visible in the UI and is not audited as a secret read.
    const prepared = fields.map((field, index) => {
      if (!field?.label && !field?.id) {
        throw new Error(`fields[${index}] has neither a \`label\` nor an \`id\``);
      }
      return { type: "CONCEALED", ...field };
    });

    const created = await client.request<{ id?: string; title?: string }>(
      base,
      `/v1/vaults/${encodeURIComponent(vaultId)}/items`,
      {
        method: "POST",
        body: compact({
          vault: { id: vaultId },
          title,
          category: String(p.category ?? "LOGIN").toUpperCase(),
          fields: prepared,
          tags: String(p.tags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
          urls: json(p.urls, "urls"),
        }),
      },
    );

    const concealedCount =
      prepared.filter((field) => String(field.type).toUpperCase() === "CONCEALED").length;

    // Counts only — never the title, and certainly never a value.
    ctx.log("info", "created a 1Password item", {
      fieldCount: prepared.length,
      concealedCount,
    });

    return {
      id: created?.id,
      title: created?.title ?? title,
      vaultId,
      fieldCount: prepared.length,
      concealedCount,
    };
  },
};

export default action;
