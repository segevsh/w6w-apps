import type { ActionDefinition } from "@w6w/types";
import { ClerkClient, compact, json } from "../lib/client.ts";
import { ORGANIZATION_ID_PARAM } from "../lib/params.ts";

/** `PATCH /organizations/{organization_id}/metadata` — deep merge, same semantics as user-update-metadata. */
const action: ActionDefinition = {
  key: "organization-update-metadata",
  type: "perform",
  resource: "organization",
  title: "Update organization metadata",
  description: "Deep-merge public/private metadata onto an organization. Set a key to null to " +
    "remove it.",
  idempotent: true,
  params: [
    ORGANIZATION_ID_PARAM,
    {
      key: "publicMetadata",
      label: "Public metadata",
      type: "json",
      default: "",
      hint: "Read-only from the Frontend API. Merged into the existing value.",
    },
    {
      key: "privateMetadata",
      label: "Private metadata",
      type: "json",
      default: "",
      hint: "Only visible to the Backend API. Merged into the existing value.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "public_metadata", type: "object", label: "Public metadata" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.organizationId ?? "").trim();
    if (!id) throw new Error("`organizationId` is required");

    const body = compact({
      public_metadata: json(p.publicMetadata, "publicMetadata"),
      private_metadata: json(p.privateMetadata, "privateMetadata"),
    });
    if (Object.keys(body).length === 0) {
      throw new Error("provide at least one of publicMetadata, privateMetadata");
    }

    return await new ClerkClient(ctx).request(
      `/organizations/${encodeURIComponent(id)}/metadata`,
      { method: "PATCH", body },
    );
  },
};
export default action;
