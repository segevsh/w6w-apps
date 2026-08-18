import type { ActionDefinition } from "@w6w/types";
import { compact, csv, json, JumpCloudClient } from "../lib/client.ts";

/**
 * `PUT /api/systems/{id}` (V1) — verified against JumpCloud's V1 OpenAPI
 * document (`systems_put`).
 *
 * Most of what this endpoint accepts is **SSH daemon policy on the machine**,
 * not metadata: root login, password authentication, public-key
 * authentication, MFA at the console. Those are the fields worth care —
 * turning off public-key authentication on a machine reached only by key locks
 * everyone out of it, and the API will do it without comment.
 *
 * They are left unset by default and only sent when explicitly chosen, so a
 * rename cannot silently rewrite a device's SSH policy.
 */
const action: ActionDefinition = {
  key: "system-update",
  type: "perform",
  resource: "system",
  title: "Update a device",
  description: "Rename a device, retag it, or change its SSH login policy.",
  idempotent: true,
  params: [
    { key: "systemId", label: "Device ID", type: "string", required: true, default: "" },
    { key: "displayName", label: "Display Name", type: "string", default: "" },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      hint: "Comma-separated. Replaces the whole tag list.",
    },
    {
      key: "allowSshRootLogin",
      label: "Allow SSH Root Login",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "true", label: "Allow" },
        { value: "false", label: "Deny" },
      ],
    },
    {
      key: "allowSshPasswordAuthentication",
      label: "Allow SSH Password Authentication",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "true", label: "Allow" },
        { value: "false", label: "Deny" },
      ],
    },
    {
      key: "allowPublicKeyAuthentication",
      label: "Allow SSH Public Key Authentication",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "true", label: "Allow" },
        { value: "false", label: "Deny — locks out anyone who reaches this device by key" },
      ],
    },
    {
      key: "allowMultiFactorAuthentication",
      label: "Require MFA at the Device",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "true", label: "Require" },
        { value: "false", label: "Do not require" },
      ],
    },
    { key: "attributes", label: "Custom Attributes", type: "json", default: "" },
  ],
  output: [
    { key: "_id", type: "string", label: "Device ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.systemId ?? "").trim();
    if (!id) throw new Error("`systemId` is required");

    // "" means "leave unchanged", so only an explicit true/false is sent.
    const tri = (v: unknown): boolean | undefined =>
      v === "true" || v === true ? true : v === "false" || v === false ? false : undefined;

    const body: Record<string, unknown> = compact({
      displayName: p.displayName,
      tags: csv(p.tags),
      attributes: json(p.attributes, "attributes"),
    });
    for (
      const key of [
        "allowSshRootLogin",
        "allowSshPasswordAuthentication",
        "allowPublicKeyAuthentication",
        "allowMultiFactorAuthentication",
      ] as const
    ) {
      const value = tri(p[key]);
      // `false` is a real setting and must survive — hence not going through compact.
      if (value !== undefined) body[key] = value;
    }
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — set at least one field");
    }

    ctx.log("info", "updating a JumpCloud device", { id, fields: Object.keys(body) });

    return await new JumpCloudClient(ctx).request(`/systems/${encodeURIComponent(id)}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;
