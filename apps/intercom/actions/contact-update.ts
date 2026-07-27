import type { ActionDefinition } from "@w6w/types";
import { compact, IntercomClient } from "../lib/client.ts";

interface Input {
  contactId: string;
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
 * PUT /contacts/{id} — update a contact by its Intercom id. Only the fields you
 * supply are changed; the client omits blank inputs so unset fields are left
 * untouched rather than cleared.
 */
const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact by its Intercom contact ID. Only supplied fields are changed.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        { value: "user", label: "User" },
        { value: "lead", label: "Lead" },
      ],
    },
    { key: "email", label: "Email", type: "string" },
    { key: "externalId", label: "External ID", type: "string" },
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
    { key: "signedUpAt", label: "Signed up at (Unix seconds)", type: "number", advanced: true },
    { key: "lastSeenAt", label: "Last seen at (Unix seconds)", type: "number", advanced: true },
    { key: "customAttributes", label: "Custom attributes", type: "json", advanced: true },
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
    return new IntercomClient(ctx).request(`/contacts/${encodeURIComponent(input.contactId)}`, {
      method: "PUT",
      body,
    });
  },
};

export default contactUpdate;
