import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam } from "../lib/params.ts";

/**
 * `POST /affiliates` — create a new affiliate, optionally with a preferred
 * `affiliate_id` (may be adjusted by ThriveCart to stay unique) and
 * registered for one or more products. Not idempotent: this creates a new
 * account.
 */
interface Input {
  email: string;
  name?: string;
  affiliateId?: string;
  productIds: string[] | string;
  autoApprove?: boolean;
  parentAffiliate?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  country?: string;
  city?: string;
  state?: string;
  zip?: string;
  triggerEmails?: boolean;
  mode?: string;
}

const affiliateCreate: ActionDefinition<Input> = {
  key: "affiliate-create",
  type: "perform",
  resource: "affiliate",
  title: "Create Affiliate",
  description: "Create a new affiliate in the account.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true, hint: "Used to sign in." },
    { key: "name", label: "Name", type: "string" },
    {
      key: "affiliateId",
      label: "Preferred affiliate ID",
      type: "string",
      hint: "Optional. May be modified by ThriveCart to ensure uniqueness.",
    },
    {
      key: "productIds",
      label: "Product IDs",
      type: "multiselect",
      required: true,
      hint: "At least one product to register this affiliate for.",
    },
    { key: "autoApprove", label: "Auto-approve", type: "boolean" },
    { key: "parentAffiliate", label: "Referred by (affiliate ID)", type: "string" },
    { key: "firstName", label: "First name", type: "string", advanced: true },
    { key: "lastName", label: "Last name", type: "string", advanced: true },
    { key: "company", label: "Company", type: "string", advanced: true },
    {
      key: "country",
      label: "Country",
      type: "string",
      advanced: true,
      hint: "2-letter country code.",
    },
    { key: "city", label: "City", type: "string", advanced: true },
    { key: "state", label: "State/region", type: "string", advanced: true },
    { key: "zip", label: "ZIP/postal code", type: "string", advanced: true },
    {
      key: "triggerEmails",
      label: "Send emails",
      type: "boolean",
      default: true,
      hint: "Notify the affiliate and vendor. Defaults to true on ThriveCart's side.",
    },
    modeParam,
  ],
  output: [{ key: "data", type: "object", label: "Created affiliate" }],

  execute(input, ctx) {
    const productIds = Array.isArray(input.productIds) ? input.productIds : [input.productIds];
    return new ThriveCartClient(ctx).post("/affiliates", {
      form: {
        email: input.email,
        name: input.name,
        affiliate_id: input.affiliateId,
        product_ids: productIds,
        auto_approve: input.autoApprove,
        parent_affiliate: input.parentAffiliate,
        first_name: input.firstName,
        last_name: input.lastName,
        company: input.company,
        country: input.country,
        city: input.city,
        state: input.state,
        zip: input.zip,
        trigger_emails: input.triggerEmails,
      },
      mode: input.mode,
    });
  },
};

export default affiliateCreate;
