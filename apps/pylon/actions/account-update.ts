import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, jsonValue, PylonClient, seg, strList } from "../lib/client.ts";
import { ACCOUNT_OUTPUT, customFieldsParam, idParam } from "../lib/params.ts";

interface Input {
  id: string;
  name?: string;
  accountType?: string;
  domains?: string[] | string;
  primaryDomain?: string;
  externalIds?: unknown;
  ownerId?: string;
  logoUrl?: string;
  isDisabled?: boolean;
  tags?: string[] | string;
  customFields?: unknown;
}

/** `PATCH /accounts/{id}` — only provided fields change; an empty `owner_id` removes the owner. */
const accountUpdate: ActionDefinition<Input> = {
  key: "account-update",
  type: "perform",
  resource: "account",
  title: "Update Account",
  description: "Update an account by its Pylon ID or external ID. Only the fields you set change.",
  idempotent: true,
  params: [
    idParam("Account ID or external ID"),
    { key: "name", label: "Name", type: "string" },
    {
      key: "accountType",
      label: "Account type",
      type: "select",
      hint: "An account can only be changed to customer or partner.",
      options: [
        { value: "customer", label: "Customer" },
        { value: "partner", label: "Partner" },
      ],
    },
    { key: "domains", label: "Domains", type: "array", item: { type: "string" } },
    { key: "primaryDomain", label: "Primary domain", type: "string" },
    {
      key: "externalIds",
      label: "External IDs",
      type: "json",
      hint: 'Replaces the account\'s external IDs: [{"external_id":"acme-42","label":"billing"}].',
    },
    {
      key: "ownerId",
      label: "Owner user ID",
      type: "string",
      hint: "An empty string removes the owner.",
    },
    { key: "logoUrl", label: "Logo URL", type: "string" },
    { key: "isDisabled", label: "Disabled", type: "boolean" },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string" },
      hint: "Replaces the account's tags with exactly this list.",
    },
    customFieldsParam("account"),
  ],
  output: ACCOUNT_OUTPUT,

  execute(input, ctx) {
    return new PylonClient(ctx).one("PATCH", `/accounts/${seg(input.id)}`, {
      body: compact({
        name: input.name,
        account_type: input.accountType || undefined,
        domains: strList(input.domains),
        primary_domain: input.primaryDomain,
        external_ids: jsonValue(input.externalIds),
        owner_id: input.ownerId,
        logo_url: input.logoUrl,
        is_disabled: input.isDisabled,
        tags: input.tags === undefined ? undefined : (strList(input.tags) ?? []),
        custom_fields: customFields(input.customFields),
      }),
    });
  },
};

export default accountUpdate;
