import type { ActionDefinition } from "@w6w/types";
import { ClerkClient, compact, json } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "organization-create",
  type: "perform",
  resource: "organization",
  title: "Create organization",
  description: "Create a new organization.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, default: "" },
    {
      key: "slug",
      label: "Slug",
      type: "string",
      default: "",
      hint: "Lowercase alphanumeric and dashes only. Only used if slugs are enabled for the " +
        "instance.",
    },
    {
      key: "createdBy",
      label: "Created-by user ID",
      type: "string",
      default: "",
      hint: "Becomes that user's active organization at their next session, unless they set a " +
        "different one first.",
    },
    {
      key: "publicMetadata",
      label: "Public metadata",
      type: "json",
      default: "",
      advanced: true,
    },
    {
      key: "privateMetadata",
      label: "Private metadata",
      type: "json",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "slug", type: "string", label: "Slug" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    return await new ClerkClient(ctx).request("/organizations", {
      method: "POST",
      body: compact({
        name,
        slug: p.slug,
        created_by: p.createdBy,
        public_metadata: json(p.publicMetadata, "publicMetadata"),
        private_metadata: json(p.privateMetadata, "privateMetadata"),
      }),
    });
  },
};
export default action;
