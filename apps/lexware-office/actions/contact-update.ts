import type { ActionDefinition } from "@w6w/types";
import { asObject, encodeId, LexwareClient } from "../lib/client.ts";
import { ACTION_RESULT_OUTPUT } from "../lib/factory.ts";

/**
 * `PUT /v1/contacts/{id}` — a full replacement guarded by optimistic locking: the body must
 * carry the contact's current `version`, and a stale one is a 409. A contact with more than one
 * entry in an email, phone, billing/shipping address or contact-person list cannot be updated
 * through the API at all (the vendor answers a validation error).
 */
interface Input {
  id: string;
  version: number;
  contact: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Replace a contact with the given body. Fetch it first (Get Contact), change it, " +
    "and send it back with the version you read.",
  idempotent: false,
  params: [
    { key: "id", label: "Contact id", type: "string", required: true },
    {
      key: "version",
      label: "Version",
      type: "number",
      required: true,
      validation: { min: 0, integer: true },
      hint: "The `version` from Get Contact. A stale value is rejected with 409.",
    },
    {
      key: "contact",
      label: "Contact (JSON)",
      type: "json",
      required: true,
      hint: "The whole contact body (roles plus company or person, addresses, emails, ...). " +
        "PUT replaces, so omitted fields are cleared.",
    },
  ],
  output: ACTION_RESULT_OUTPUT,
  async execute(input, ctx) {
    const id = String(input.id ?? "").trim();
    if (!id) throw new Error("Contact id is required");
    const version = Number(input.version);
    if (!Number.isInteger(version) || version < 0) throw new Error("Version is required");
    const body = { ...asObject(input.contact, "Contact"), version };
    return await new LexwareClient(ctx).json(`/contacts/${encodeId(id)}`, { method: "PUT", body });
  },
};

export default contactUpdate;
