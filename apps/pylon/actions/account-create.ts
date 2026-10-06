import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, jsonValue, PylonClient, strList } from "../lib/client.ts";
import { ACCOUNT_OUTPUT, customFieldsParam } from "../lib/params.ts";

interface Input {
  name: string;
  accountType?: string;
  domains?: string[] | string;
  primaryDomain?: string;
  externalIds?: unknown;
  ownerId?: string;
  logoUrl?: string;
  tags?: string[] | string;
  customFields?: unknown;
}

/**
 * `POST /accounts` — only `name` is required. The singular `domain` field is DEPRECATED ("use
 * Domains and PrimaryDomain"), so it is not exposed. With any domains there must be exactly one
 * primary.
 */
const accountCreate: ActionDefinition<Input> = {
  key: "account-create",
  type: "perform",
  resource: "account",
  title: "Create Account",
  description: "Create a customer, partner, community or internal account.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "accountType",
      label: "Account type",
      type: "select",
      hint: "Defaults to customer.",
      options: [
        { value: "customer", label: "Customer" },
        { value: "internal", label: "Internal" },
        { value: "community", label: "Community" },
        { value: "partner", label: "Partner" },
      ],
    },
    {
      key: "domains",
      label: "Domains",
      type: "array",
      item: { type: "string" },
      hint: "Without a scheme, e.g. stripe.com. Set a primary domain from this list.",
    },
    { key: "primaryDomain", label: "Primary domain", type: "string" },
    {
      key: "externalIds",
      label: "External IDs",
      type: "json",
      hint: 'Your own IDs for this account: [{"external_id":"acme-42","label":"billing"}].',
    },
    { key: "ownerId", label: "Owner user ID", type: "string" },
    { key: "logoUrl", label: "Logo URL", type: "string", hint: "A square .png, .jpg or .jpeg." },
    { key: "tags", label: "Tags", type: "array", item: { type: "string" } },
    customFieldsParam("account"),
  ],
  output: ACCOUNT_OUTPUT,

  execute(input, ctx) {
    return new PylonClient(ctx).one("POST", "/accounts", {
      body: compact({
        name: input.name,
        account_type: input.accountType || undefined,
        domains: strList(input.domains),
        primary_domain: input.primaryDomain,
        external_ids: jsonValue(input.externalIds),
        owner_id: input.ownerId,
        logo_url: input.logoUrl,
        tags: strList(input.tags),
        custom_fields: customFields(input.customFields),
      }),
    });
  },
};

export default accountCreate;
