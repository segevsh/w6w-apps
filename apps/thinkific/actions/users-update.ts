import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { customProfileFieldsParam, providerOptions, rolesParam } from "../lib/users.ts";

interface CustomProfileFieldInput {
  custom_profile_field_definition_id: number;
  value?: string;
}

interface Input {
  id: string;
  provider?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  roles?: string[];
  avatarUrl?: string;
  bio?: string;
  company?: string;
  headline?: string;
  externalSource?: string;
  affiliateCode?: string;
  affiliateCommission?: number;
  affiliateCommissionType?: string;
  affiliatePayoutEmail?: string;
  custom_profile_fields?: CustomProfileFieldInput[];
}

/**
 * `PUT /users/{id}` — update a User. Returns 204 with no body.
 *
 * `email`: the vendor's own schema description is explicit that this "can
 * only be updated by private integrations" (i.e. API-key connections, not
 * every OAuth-scoped app) — worth surfacing in the hint since a public app
 * hitting this same field could see it silently ignored rather than
 * rejected.
 */
const usersUpdate: ActionDefinition<Input> = {
  key: "users-update",
  type: "perform",
  resource: "users",
  title: "Update User",
  description: "Update an existing User. Only the fields provided are changed.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "User ID",
      type: "string",
      required: true,
      hint: "A Thinkific numeric User ID, or an External ID (requires Provider below).",
    },
    {
      key: "provider",
      label: "Provider",
      type: "select",
      options: providerOptions,
      hint: "Required only when ID above is an External ID rather than a Thinkific ID.",
    },
    { key: "first_name", label: "First name", type: "string" },
    { key: "last_name", label: "Last name", type: "string" },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Can only be changed through a private (API-key) integration — an OAuth-scoped app " +
        "may see this field silently ignored.",
    },
    { key: "password", label: "Password", type: "secret", validation: { minLength: 6 } },
    rolesParam,
    { key: "avatarUrl", label: "Avatar URL", type: "string", advanced: true },
    { key: "bio", label: "Bio", type: "text", advanced: true },
    { key: "company", label: "Company", type: "string", advanced: true },
    { key: "headline", label: "Headline", type: "string", advanced: true },
    { key: "externalSource", label: "External source", type: "string", advanced: true },
    {
      key: "affiliateCode",
      label: "Affiliate code",
      type: "string",
      advanced: true,
      hint: "Required only if this User is an affiliate.",
    },
    {
      key: "affiliateCommission",
      label: "Affiliate commission",
      type: "number",
      advanced: true,
      validation: { min: 0, max: 9999.99 },
    },
    {
      key: "affiliateCommissionType",
      label: "Affiliate commission type",
      type: "select",
      options: [
        { value: "%", label: "Percentage" },
        { value: "$", label: "Fixed amount" },
      ],
      advanced: true,
    },
    {
      key: "affiliatePayoutEmail",
      label: "Affiliate payout email",
      type: "string",
      advanced: true,
    },
    customProfileFieldsParam,
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const body = {
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      password: input.password,
      roles: input.roles,
      avatar_url: input.avatarUrl,
      bio: input.bio,
      company: input.company,
      headline: input.headline,
      external_source: input.externalSource,
      affiliate_code: input.affiliateCode,
      affiliate_commission: input.affiliateCommission,
      affiliate_commission_type: input.affiliateCommissionType,
      affiliate_payout_email: input.affiliatePayoutEmail,
      custom_profile_fields: input.custom_profile_fields,
    };
    const status = await new ThinkificClient(ctx).status(
      `/users/${encodeURIComponent(input.id)}`,
      { method: "PUT", query: { provider: input.provider }, body },
    );
    return { status };
  },
};

export default usersUpdate;
