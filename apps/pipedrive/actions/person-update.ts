import type { ActionDefinition } from "@w6w/types";
import { compact, PipedriveClient } from "../lib/client.ts";

interface Input {
  personId: number;
  name?: string;
  ownerId?: number;
  orgId?: number;
  email?: unknown;
  phone?: unknown;
  label?: number;
  visibleTo?: string;
}

/** PUT /persons/{id} — update a person. Only the supplied fields change. */
const personUpdate: ActionDefinition<Input> = {
  key: "person-update",
  type: "perform",
  resource: "person",
  title: "Update Person",
  description: "Update fields on an existing person.",
  idempotent: true,
  params: [
    { key: "personId", label: "Person ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
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
    return client.request(`/persons/${encodeURIComponent(String(input.personId))}`, {
      method: "PUT",
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

export default personUpdate;
