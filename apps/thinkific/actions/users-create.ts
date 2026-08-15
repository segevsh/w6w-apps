import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { customProfileFieldsParam, providerOptions, rolesParam } from "../lib/users.ts";

interface CustomProfileFieldInput {
  custom_profile_field_definition_id: number;
  value?: string;
}

interface Input {
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  roles?: string[];
  bio?: string;
  company?: string;
  headline?: string;
  affiliateCode?: string;
  affiliateCommission?: number;
  affiliateCommissionType?: string;
  affiliatePayoutEmail?: string;
  custom_profile_fields?: CustomProfileFieldInput[];
  skipCustomFieldsValidation?: boolean;
  sendWelcomeEmail?: boolean;
  externalId?: string;
  provider?: string;
}

/**
 * `POST /users` — create a User.
 *
 * `password`: "If not included, the Express Sign In Link becomes activated
 * for the User" (vendor description, verbatim) — omitting it is a supported,
 * common choice for an integration that provisions accounts on someone
 * else's behalf, not a validation gap.
 */
const usersCreate: ActionDefinition<Input> = {
  key: "users-create",
  type: "perform",
  resource: "users",
  title: "Create User",
  description: "Create a new User on this Site.",
  idempotent: false,
  params: [
    { key: "first_name", label: "First name", type: "string", required: true },
    { key: "last_name", label: "Last name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "password",
      label: "Password",
      type: "secret",
      validation: { minLength: 6 },
      hint: "Leave empty to activate the Express Sign In Link for this User instead.",
    },
    rolesParam,
    { key: "bio", label: "Bio", type: "text", advanced: true },
    { key: "company", label: "Company", type: "string", advanced: true },
    { key: "headline", label: "Headline", type: "string", advanced: true },
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
      hint: "Required only if this User is an affiliate. 0-100 for percentage type, otherwise " +
        "under 9999.99.",
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
    {
      key: "skipCustomFieldsValidation",
      label: "Skip custom fields validation",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "sendWelcomeEmail",
      label: "Send welcome email",
      type: "boolean",
      default: false,
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      advanced: true,
      hint: "Identifier of this User in an external system, used with Thinkific SSO.",
    },
    {
      key: "provider",
      label: "Provider",
      type: "select",
      options: providerOptions,
      advanced: true,
      hint: "The single sign-on type External ID above is associated with. Defaults to SSO.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "full_name", type: "string", label: "Full name" },
  ],

  async execute(input, ctx) {
    const body = {
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      password: input.password,
      roles: input.roles,
      bio: input.bio,
      company: input.company,
      headline: input.headline,
      affiliate_code: input.affiliateCode,
      affiliate_commission: input.affiliateCommission,
      affiliate_commission_type: input.affiliateCommissionType,
      affiliate_payout_email: input.affiliatePayoutEmail,
      custom_profile_fields: input.custom_profile_fields,
      skip_custom_fields_validation: input.skipCustomFieldsValidation,
      send_welcome_email: input.sendWelcomeEmail,
      external_id: input.externalId,
      provider: input.provider,
    };
    return await new ThinkificClient(ctx).json("/users", { method: "POST", body });
  },
};

export default usersCreate;
