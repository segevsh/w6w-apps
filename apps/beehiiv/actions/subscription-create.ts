import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BeehiivClient, compact, toList } from "../lib/client.ts";
import { publicationIdParam } from "../lib/params.ts";

interface Input {
  publicationId: string;
  email: string;
  reactivateExisting?: boolean;
  sendWelcomeEmail?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referringSite?: string;
  referralCode?: string;
  customFields?: unknown;
  doubleOptOverride?: "on" | "off" | "not_set";
  tier?: "free" | "premium";
  premiumTiers?: string;
  premiumTierIds?: string;
  stripeCustomerId?: string;
  automationIds?: string;
  newsletterListIds?: string;
}

/** `POST /publications/{publicationId}/subscriptions` — create/upsert a subscriber. */
const subscriptionCreate: ActionDefinition<Input> = {
  key: "subscription-create",
  type: "perform",
  resource: "subscription",
  title: "Create Subscription",
  description: "Create a new subscription for a publication.",
  idempotent: false,
  params: [
    publicationIdParam,
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "reactivateExisting",
      label: "Reactivate if unsubscribed",
      type: "boolean",
      hint: "Only use when the subscriber is knowingly resubscribing.",
    },
    { key: "sendWelcomeEmail", label: "Send welcome email", type: "boolean" },
    { key: "utmSource", label: "UTM source", type: "string" },
    { key: "utmMedium", label: "UTM medium", type: "string" },
    { key: "utmCampaign", label: "UTM campaign", type: "string" },
    { key: "utmTerm", label: "UTM term", type: "string" },
    { key: "utmContent", label: "UTM content", type: "string" },
    { key: "referringSite", label: "Referring site", type: "string" },
    {
      key: "referralCode",
      label: "Referral code",
      type: "string",
      hint: "An existing subscriber's referral_code — credits them for this signup.",
    },
    {
      key: "customFields",
      label: "Custom fields (JSON array)",
      type: "json",
      hint: 'e.g. [{"name": "First Name", "value": "Bruce"}]. Fields must already exist.',
    },
    {
      key: "doubleOptOverride",
      label: "Double opt-in override",
      type: "select",
      options: [
        { value: "on", label: "On — require confirmation" },
        { value: "off", label: "Off — mark active immediately" },
        { value: "not_set", label: "Not set — use the publication default" },
      ],
    },
    {
      key: "tier",
      label: "Tier",
      type: "select",
      options: [{ value: "free", label: "Free" }, { value: "premium", label: "Premium" }],
    },
    {
      key: "premiumTiers",
      label: "Premium tier names",
      type: "string",
      hint: "Comma-separated. Takes precedence over Tier; combines with Premium tier IDs.",
    },
    {
      key: "premiumTierIds",
      label: "Premium tier IDs",
      type: "string",
      hint: "Comma-separated. Takes precedence over Tier; combines with Premium tier names.",
    },
    { key: "stripeCustomerId", label: "Stripe customer ID", type: "string" },
    {
      key: "automationIds",
      label: "Automation IDs",
      type: "string",
      hint: "Comma-separated. Enrolls the subscriber; each automation needs an active " +
        "'Add by API' trigger.",
    },
    {
      key: "newsletterListIds",
      label: "Newsletter list IDs",
      type: "string",
      hint: "Comma-separated.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    return await new BeehiivClient(ctx).data(
      `/publications/${encodeURIComponent(input.publicationId)}/subscriptions`,
      {
        method: "POST",
        body: compact({
          email: input.email,
          reactivate_existing: input.reactivateExisting,
          send_welcome_email: input.sendWelcomeEmail,
          utm_source: input.utmSource,
          utm_medium: input.utmMedium,
          utm_campaign: input.utmCampaign,
          utm_term: input.utmTerm,
          utm_content: input.utmContent,
          referring_site: input.referringSite,
          referral_code: input.referralCode,
          custom_fields: asOptionalJson(input.customFields, "customFields"),
          double_opt_override: input.doubleOptOverride,
          tier: input.tier,
          premium_tiers: toList(input.premiumTiers),
          premium_tier_ids: toList(input.premiumTierIds),
          stripe_customer_id: input.stripeCustomerId,
          automation_ids: toList(input.automationIds),
          newsletter_list_ids: toList(input.newsletterListIds),
        }),
      },
    );
  },
};

export default subscriptionCreate;
