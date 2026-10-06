import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, jsonValue, PylonClient, strList } from "../lib/client.ts";
import { CONTACT_OUTPUT, customFieldsParam } from "../lib/params.ts";

interface Input {
  name: string;
  email?: string;
  accountId?: string;
  accountExternalId?: string;
  phoneNumbers?: string[] | string;
  primaryPhoneNumber?: string;
  portalRole?: string;
  avatarUrl?: string;
  externalIds?: unknown;
  customFields?: unknown;
}

/** `POST /contacts` — only `name` is required. `account_id` and `account_external_id` are exclusive. */
const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact, optionally attached to an account.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "email", label: "Email", type: "string" },
    { key: "accountId", label: "Account ID", type: "string" },
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
    return new PylonClient(ctx).one("POST", "/contacts", {
      body: compact({
        name: input.name,
        email: input.email,
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

export default contactCreate;
