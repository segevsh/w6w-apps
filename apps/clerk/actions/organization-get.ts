import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";
import { ORGANIZATION_ID_PARAM } from "../lib/params.ts";

const action: ActionDefinition = {
  key: "organization-get",
  type: "read",
  resource: "organization",
  title: "Get organization",
  description: "Retrieve a single organization by ID or slug.",
  params: [ORGANIZATION_ID_PARAM],
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
  ],

  async execute(input, ctx) {
    const id = String((input as Record<string, unknown>).organizationId ?? "").trim();
    if (!id) throw new Error("`organizationId` is required");
    return await new ClerkClient(ctx).request(`/organizations/${encodeURIComponent(id)}`);
  },
};
export default action;
