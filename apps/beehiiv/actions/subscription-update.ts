import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BeehiivClient, compact, toList } from "../lib/client.ts";
import { publicationIdParam, subscriptionIdParam } from "../lib/params.ts";

interface Input {
  publicationId: string;
  subscriptionId: string;
  tier?: "free" | "premium";
  premiumTiers?: string;
  premiumTierIds?: string;
  email?: string;
  stripeCustomerId?: string;
  unsubscribe?: boolean;
  customFields?: unknown;
  newsletterListIds?: string;
  unsubscribeNewsletterListIds?: string;
  complimentaryGiftId?: string;
}

/**
 * `PATCH /publications/{publicationId}/subscriptions/{subscriptionId}`.
 *
 * `newsletterListIds` ADDS to the subscriber's existing list memberships
 * (does not replace them) and cannot be combined with `unsubscribe`.
 */
const subscriptionUpdate: ActionDefinition<Input> = {
  key: "subscription-update",
  type: "perform",
  resource: "subscription",
  title: "Update Subscription",
  description: "Update an existing subscription. Only given fields change.",
  idempotent: true,
  params: [
    publicationIdParam,
    subscriptionIdParam,
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
      hint: "Comma-separated. Takes precedence over Tier.",
    },
    { key: "premiumTierIds", label: "Premium tier IDs", type: "string", hint: "Comma-separated." },
    { key: "email", label: "New email", type: "string" },
    { key: "stripeCustomerId", label: "Stripe customer ID", type: "string" },
    { key: "unsubscribe", label: "Unsubscribe from the publication", type: "boolean" },
    {
      key: "customFields",
      label: "Custom fields (JSON array)",
      type: "json",
      hint: 'e.g. [{"name": "First Name", "value": "Bruce"}].',
    },
    {
      key: "newsletterListIds",
      label: "Add to newsletter lists",
      type: "string",
      hint: "Comma-separated IDs. Adds to existing memberships. Cannot combine with Unsubscribe.",
    },
    {
      key: "unsubscribeNewsletterListIds",
      label: "Remove from newsletter lists",
      type: "string",
      hint: "Comma-separated IDs. A no-op for a list the subscriber isn't on.",
    },
    { key: "complimentaryGiftId", label: "Complimentary access ID", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    return await new BeehiivClient(ctx).data(
      `/publications/${encodeURIComponent(input.publicationId)}/subscriptions/${
        encodeURIComponent(input.subscriptionId)
      }`,
      {
        method: "PATCH",
        body: compact({
          tier: input.tier,
          premium_tiers: toList(input.premiumTiers),
          premium_tier_ids: toList(input.premiumTierIds),
          email: input.email,
          stripe_customer_id: input.stripeCustomerId,
          unsubscribe: input.unsubscribe,
          custom_fields: asOptionalJson(input.customFields, "customFields"),
          newsletter_list_ids: toList(input.newsletterListIds),
          unsubscribe_newsletter_list_ids: toList(input.unsubscribeNewsletterListIds),
          complimentary_gift_id: input.complimentaryGiftId,
        }),
      },
    );
  },
};

export default subscriptionUpdate;
