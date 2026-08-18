import type { ActionDefinition } from "@w6w/types";
import { compact, json, ResendClient } from "../lib/client.ts";

/**
 * `PATCH /contacts/{id}` — verified against Resend's OpenAPI document, which
 * takes an ID **or an email address** in the path.
 *
 * The usual reason to call it: flipping `unsubscribed`, which is why `false` is
 * passed through rather than dropped as falsy — re-subscribing a contact is a
 * real update, not a no-op.
 */
const action: ActionDefinition = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update a contact",
  description: "Change a contact's details or subscription status.",
  idempotent: true,
  params: [
    {
      key: "contact",
      label: "Contact ID or Email",
      type: "string",
      required: true,
      default: "",
    },
    { key: "email", label: "Email", type: "string", default: "" },
    { key: "firstName", label: "First Name", type: "string", default: "" },
    { key: "lastName", label: "Last Name", type: "string", default: "" },
    {
      key: "unsubscribed",
      label: "Unsubscribed",
      type: "boolean",
      default: null,
      hint: "Set false to re-subscribe. Leave unset to keep the current state.",
    },
    { key: "properties", label: "Custom Properties", type: "json", default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "object", type: "string", label: "Object type" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contact = String(p.contact ?? "").trim();
    if (!contact) throw new Error("`contact` is required — an ID or an email address");

    const body = compact({
      email: p.email,
      first_name: p.firstName,
      last_name: p.lastName,
      // Both true and false are meaningful; only "unset" is dropped.
      unsubscribed: typeof p.unsubscribed === "boolean" ? p.unsubscribed : undefined,
      properties: json(p.properties, "properties"),
    });
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — set at least one field");
    }

    ctx.log("info", "updating Resend contact", { contact, fields: Object.keys(body) });

    return await new ResendClient(ctx).request(`/contacts/${encodeURIComponent(contact)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default action;
