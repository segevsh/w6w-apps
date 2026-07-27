import type { ActionDefinition } from "@w6w/types";
import { compact, PipedriveClient } from "../lib/client.ts";

interface Input {
  name: string;
  ownerId?: number;
  orgId?: number;
  email?: unknown;
  phone?: unknown;
  label?: number;
  visibleTo?: string;
}

/**
 * POST /persons — create a person (contact). `email` and `phone` accept either a
 * bare string or Pipedrive's array-of-`{ value, primary, label }` form, so they
 * are passed through as-is.
 */
const personCreate: ActionDefinition<Input> = {
  key: "person-create",
  type: "perform",
  resource: "person",
  title: "Create Person",
  description: "Create a new person (contact).",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "ownerId", label: "Owner (user ID)", type: "number" },
    { key: "orgId", label: "Organization ID", type: "number" },
    {
      key: "email",
      label: "Email",
      type: "json",
      hint: "A string, or an array of `{ value, primary, label }` objects.",
    },
    {
      key: "phone",
      label: "Phone",
      type: "json",
      hint: "A string, or an array of `{ value, primary, label }` objects.",
    },
    { key: "label", label: "Label ID", type: "number" },
    { key: "visibleTo", label: "Visible to", type: "string" },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "data", type: "object", label: "Person" },
  ],

  execute(input, ctx) {
    const client = new PipedriveClient(ctx);
    return client.request("/persons", {
      method: "POST",
      body: compact({
        name: input.name,
        owner_id: input.ownerId,
        org_id: input.orgId,
        email: input.email,
        phone: input.phone,
        label: input.label,
        visible_to: input.visibleTo,
      }),
    });
  },
};

export default personCreate;
