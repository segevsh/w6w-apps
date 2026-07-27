import type { ActionDefinition } from "@w6w/types";
import { compact, PipedriveClient } from "../lib/client.ts";

interface Input {
  name: string;
  ownerId?: number;
  label?: number;
  visibleTo?: string;
}

/** POST /organizations — create an organization. Only `name` is required. */
const organizationCreate: ActionDefinition<Input> = {
  key: "organization-create",
  type: "perform",
  resource: "organization",
  title: "Create Organization",
  description: "Create a new organization.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "ownerId", label: "Owner (user ID)", type: "number" },
    { key: "label", label: "Label ID", type: "number" },
    { key: "visibleTo", label: "Visible to", type: "string" },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "data", type: "object", label: "Organization" },
  ],

  execute(input, ctx) {
    const client = new PipedriveClient(ctx);
    return client.request("/organizations", {
      method: "POST",
      body: compact({
        name: input.name,
        owner_id: input.ownerId,
        label: input.label,
        visible_to: input.visibleTo,
      }),
    });
  },
};

export default organizationCreate;
