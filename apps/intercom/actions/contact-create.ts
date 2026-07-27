import type { ActionDefinition } from "@w6w/types";
import { compact, IntercomClient } from "../lib/client.ts";

interface Input {
  role?: string;
  email?: string;
  externalId?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  ownerId?: number;
  unsubscribedFromEmails?: boolean;
  signedUpAt?: number;
  lastSeenAt?: number;
  customAttributes?: Record<string, unknown>;
}

/**
 * POST /contacts — create a contact. Intercom requires at least one of `email`
 * or `external_id`; a `role` of `user` (signed-up) or `lead` (logged-out) is
 * optional and defaults to `user` on Intercom's side.
 */
const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create an Intercom contact (user or lead). Requires an email or an external ID.",
  idempotent: false,
  params: [
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        { value: "user", label: "User" },
        { value: "lead", label: "Lead" },
      ],
      hint: "`user` for a signed-up contact, `lead` for a logged-out one.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Required unless an external ID is set.",
    },
    { key: "externalId", label: "External ID", type: "string", hint: "Your own unique id." },
    { key: "phone", label: "Phone", type: "string" },
    { key: "name", label: "Name", type: "string" },
    { key: "avatar", label: "Avatar URL", type: "string", advanced: true },
    { key: "ownerId", label: "Owner (admin) ID", type: "number", advanced: true },
    {
      key: "unsubscribedFromEmails",
      label: "Unsubscribed from emails",
      type: "boolean",
      advanced: true,
    },
    {
      key: "signedUpAt",
      label: "Signed up at (Unix seconds)",
      type: "number",
      advanced: true,
    },
    { key: "lastSeenAt", label: "Last seen at (Unix seconds)", type: "number", advanced: true },
    {
      key: "customAttributes",
      label: "Custom attributes",
      type: "json",
      advanced: true,
      hint: "Object of custom attribute key/values defined on your workspace.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "type", type: "string", label: "Type" },
  ],

  execute(input, ctx) {
    const body = compact({
      role: input.role,
      email: input.email,
      external_id: input.externalId,
      phone: input.phone,
      name: input.name,
      avatar: input.avatar,
      owner_id: input.ownerId,
      unsubscribed_from_emails: input.unsubscribedFromEmails,
      signed_up_at: input.signedUpAt,
      last_seen_at: input.lastSeenAt,
      custom_attributes: input.customAttributes,
    });
    return new IntercomClient(ctx).request("/contacts", { method: "POST", body });
  },
};

export default contactCreate;
