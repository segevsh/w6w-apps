import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";

/**
 * `DELETE /contacts/{id}` — verified against Resend's OpenAPI document, which
 * takes an ID or an email address in the path.
 */
const action: ActionDefinition = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete a contact",
  description: "Remove a contact by ID or email address.",
  idempotent: true,
  params: [
    { key: "contact", label: "Contact ID or Email", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contact = String(p.contact ?? "").trim();
    if (!contact) throw new Error("`contact` is required — an ID or an email address");

    ctx.log("info", "deleting Resend contact", { contact });

    return await new ResendClient(ctx).request(`/contacts/${encodeURIComponent(contact)}`, {
      method: "DELETE",
    });
  },
};

export default action;
