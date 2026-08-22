import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";

/**
 * `GET /contacts/{id}` — verified against Resend's OpenAPI document, whose
 * path parameter is documented as "The Contact ID **or email address**". Both
 * work, which is why this takes one field rather than making the caller
 * resolve an id first.
 */
const action: ActionDefinition = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get a contact",
  description: "Retrieve one contact by ID or email address.",
  params: [
    {
      key: "contact",
      label: "Contact ID or Email",
      type: "string",
      required: true,
      default: "",
      placeholder: "someone@example.com",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "unsubscribed", type: "boolean", label: "Unsubscribed" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contact = String(p.contact ?? "").trim();
    if (!contact) throw new Error("`contact` is required — an ID or an email address");

    ctx.log("info", "getting Resend contact", { contact });
    return await new ResendClient(ctx).request(`/contacts/${encodeURIComponent(contact)}`);
  },
};

export default action;
