import type { ActionDefinition } from "@w6w/types";
import { BeehiivClient, toList } from "../lib/client.ts";
import { bracketQuery, publicationIdParam, subscriptionIdParam } from "../lib/params.ts";

interface Input {
  publicationId: string;
  subscriptionId: string;
  expand?: string;
}

/** `GET /publications/{publicationId}/subscriptions/{subscriptionId}`. */
const subscriptionGet: ActionDefinition<Input> = {
  key: "subscription-get",
  type: "read",
  resource: "subscription",
  title: "Get Subscription",
  description: "Retrieve a single subscription by its subscription ID.",
  params: [
    publicationIdParam,
    subscriptionIdParam,
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
      `/publications/${encodeURIComponent(input.publicationId)}/subscriptions/${
        encodeURIComponent(input.subscriptionId)
      }`,
      { query: bracketQuery("expand", toList(input.expand)) },
    );
  },
};

export default subscriptionGet;
