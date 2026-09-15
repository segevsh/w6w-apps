import type { ActionDefinition } from "@w6w/types";
import { ClerkClient, compact } from "../lib/client.ts";
import { ORGANIZATION_ID_PARAM } from "../lib/params.ts";

/**
 * `PATCH /organizations/{organization_id}` — same 2026-05-12 metadata split as `user-update`:
 * this endpoint no longer accepts metadata fields. Use `organization-update-metadata`.
 */
const action: ActionDefinition = {
  key: "organization-update",
  type: "perform",
  resource: "organization",
  title: "Update organization",
  description: "Update an organization's name or slug. Does not touch metadata — use \"Update " +
    'organization metadata" for that.',
  idempotent: true,
  params: [
    ORGANIZATION_ID_PARAM,
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "slug", label: "Slug", type: "string", default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "updated_at", type: "number", label: "Updated at (unix ms)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.organizationId ?? "").trim();
    if (!id) throw new Error("`organizationId` is required");

    const body = compact({ name: p.name, slug: p.slug });
    if (Object.keys(body).length === 0) throw new Error("provide at least a name or a slug");

    return await new ClerkClient(ctx).request(`/organizations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
    });
  },
};
export default action;
