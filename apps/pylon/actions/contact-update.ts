import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, jsonValue, PylonClient, seg, strList } from "../lib/client.ts";
import { CONTACT_OUTPUT, customFieldsParam, idParam } from "../lib/params.ts";

interface Input {
  id: string;
  name?: string;
  email?: string;
  emails?: unknown;
  accountId?: string;
  accountExternalId?: string;
  phoneNumbers?: string[] | string;
  primaryPhoneNumber?: string;
  portalRole?: string;
  avatarUrl?: string;
  externalIds?: unknown;
  customFields?: unknown;
}

/**
 * `PATCH /contacts/{id}` — only provided fields change. `email` and `emails` are exclusive; an
 * empty `account_id` removes the contact from its account.
 */
const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact by its Pylon ID or external ID. Only the fields you set change.",
  idempotent: true,
  params: [
    idParam("Contact ID or external ID"),
    { key: "name", label: "Name", type: "string" },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Exclusive with Emails.",
    },
    {
      key: "emails",
      label: "Emails",
      type: "json",
      hint:
        'All of the contact\'s emails: [{"email":"a@b.com","is_primary":true}]. Exclusive with Email.',
    },
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      hint: "An empty string removes the contact from its account.",
    },
    {
      key: "accountExternalId",
      label: "Account external ID",
      type: "string",
      hint: "Exclusive with Account ID.",
    },
    { key: "phoneNumbers", label: "Phone numbers", type: "array", item: { type: "string" } },
    { key: "primaryPhoneNumber", label: "Primary phone number", type: "string" },
    {
      key: "portalRole",
      label: "Customer portal role",
      type: "select",
      options: [
        { value: "no_access", label: "No access" },
        { value: "member", label: "Member" },
        { value: "admin", label: "Admin" },
      ],
    },
    { key: "avatarUrl", label: "Avatar URL", type: "string" },
    {
      key: "externalIds",
      label: "External IDs",
      type: "json",
      hint: '[{"external_id":"u-42","label":"app"}]',
    },
    customFieldsParam("contact"),
  ],
  output: CONTACT_OUTPUT,

  execute(input, ctx) {
    return new PylonClient(ctx).one("PATCH", `/contacts/${seg(input.id)}`, {
      body: compact({
        name: input.name,
        email: input.email,
        emails: jsonValue(input.emails),
        account_id: input.accountId,
        account_external_id: input.accountExternalId,
        phone_numbers: strList(input.phoneNumbers),
        primary_phone_number: input.primaryPhoneNumber,
        portal_role: input.portalRole || undefined,
        avatar_url: input.avatarUrl,
        external_ids: jsonValue(input.externalIds),
        custom_fields: customFields(input.customFields),
      }),
    });
  },
};

export default contactUpdate;
