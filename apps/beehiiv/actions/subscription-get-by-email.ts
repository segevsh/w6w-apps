import type { ActionDefinition } from "@w6w/types";
import { BeehiivClient, toList } from "../lib/client.ts";
import { bracketQuery, publicationIdParam } from "../lib/params.ts";

interface Input {
  publicationId: string;
  email: string;
  expand?: string;
}

/**
 * `GET /publications/{publicationId}/subscriptions/by_email/{email}`.
 *
 * The lookup most automations reach for: does this address already have a
 * subscription, and what state is it in?
 */
const subscriptionGetByEmail: ActionDefinition<Input> = {
  key: "subscription-get-by-email",
  type: "read",
  resource: "subscription",
  title: "Get Subscription by Email",
  description: "Retrieve a single subscription by its subscriber's email address.",
  params: [
    publicationIdParam,
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      hint: "Comma-separated: `subscription_premium_tiers`, `referrals`, `stats`, " +
        "`custom_fields`, `tags`, `newsletter_lists`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
    { key: "subscription_tier", type: "string", label: "Tier — free or premium" },
  ],

  async execute(input, ctx) {
    return await new BeehiivClient(ctx).data(
      `/publications/${encodeURIComponent(input.publicationId)}/subscriptions/by_email/${
        encodeURIComponent(input.email)
      }`,
      { query: bracketQuery("expand", toList(input.expand)) },
    );
  },
};

export default subscriptionGetByEmail;
