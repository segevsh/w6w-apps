import type { ActionDefinition } from "@w6w/types";
import { compact, json, ResendClient } from "../lib/client.ts";

/**
 * `POST /contacts` — verified against Resend's OpenAPI document (body requires
 * `email`; `audience_id` is one of the optional fields, not part of the path).
 *
 * Note the shape: this is the current top-level contacts endpoint, where the
 * audience is a body field. Older Resend integrations use
 * `/audiences/{id}/contacts`; that nesting is not what the current document
 * describes.
 */
const action: ActionDefinition = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create a contact",
  description: "Add a contact, optionally to an audience.",
  // Resend rejects a duplicate email rather than deduping.
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true, default: "" },
    { key: "firstName", label: "First Name", type: "string", default: "" },
    { key: "lastName", label: "Last Name", type: "string", default: "" },
    {
      key: "audienceId",
      label: "Audience ID",
      type: "string",
      default: "",
      hint: "Optional. The audience to add this contact to.",
    },
    {
      key: "unsubscribed",
      label: "Unsubscribed",
      type: "boolean",
      default: false,
      hint: "Create the contact already opted out.",
    },
    {
      key: "properties",
      label: "Custom Properties",
      type: "json",
      default: "",
      placeholder: '{"plan": "pro"}',
      hint: "Values for properties defined on the account.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "object", type: "string", label: "Object type" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = String(p.email ?? "").trim();
    if (!email) throw new Error("`email` is required");

    const body = compact({
      email,
      first_name: p.firstName,
      last_name: p.lastName,
      audience_id: p.audienceId,
      // `false` is the default, so it is only sent when explicitly true.
      unsubscribed: p.unsubscribed === true ? true : undefined,
      properties: json(p.properties, "properties"),
    });

    ctx.log("info", "creating Resend contact", { email });

    return await new ResendClient(ctx).request("/contacts", { method: "POST", body });
  },
};

export default action;
