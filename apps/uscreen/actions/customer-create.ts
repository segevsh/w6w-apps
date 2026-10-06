import type { ActionDefinition } from "@w6w/types";
import { compact, csv, csvInts, UscreenClient } from "../lib/client.ts";

interface Input {
  email: string;
  name: string;
  password?: string;
  paymentUserId?: string;
  field1?: string;
  field2?: string;
  field3?: string;
  optedInForNewsAndUpdates?: boolean;
  optedInForCommunityUpdates?: boolean;
  tags?: string;
  unsubscribedTopicIds?: string;
  legacyId?: string;
  skipInvite?: boolean;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Invite Customer",
  description:
    "Create a customer (or promote an existing lead) and, unless skipped, send the platform invite email.",
  idempotent: false,
  params: [
    {
      "key": "email",
      "label": "Email",
      "type": "string",
      "required": true,
      "hint": "Must be unique.",
    },
    {
      "key": "name",
      "label": "Name",
      "type": "string",
      "hint": "Customer's full name.",
      "required": true,
    },
    {
      "key": "password",
      "label": "Password",
      "type": "secret",
      "hint": "8 characters minimum. When blank on create, Uscreen generates one.",
    },
    {
      "key": "paymentUserId",
      "label": "Stripe customer ID",
      "type": "string",
      "hint":
        "Stripe Customer ID. Cannot be changed if the customer has an active subscription or already has both a Stripe ID and payment details.",
    },
    {
      "key": "field1",
      "label": "Custom field 1",
      "type": "string",
      "hint": "Value for the store's custom user field 1.",
    },
    {
      "key": "field2",
      "label": "Custom field 2",
      "type": "string",
      "hint": "Value for the store's custom user field 2.",
    },
    {
      "key": "field3",
      "label": "Custom field 3",
      "type": "string",
      "hint": "Value for the store's custom user field 3.",
    },
    {
      "key": "optedInForNewsAndUpdates",
      "label": "Opted in for news and updates",
      "type": "boolean",
      "hint":
        "Marketing emails. On create the default is true, and an existing lead's choice is left alone unless this is sent.",
    },
    {
      "key": "optedInForCommunityUpdates",
      "label": "Opted in for community updates",
      "type": "boolean",
      "hint": "Community update emails.",
    },
    {
      "key": "tags",
      "label": "Tags",
      "type": "string",
      "hint":
        "Comma-separated tag names: lowercase letters, numbers and dashes only, at most 25. On update this REPLACES the customer's whole tag set; leave empty to leave tags unchanged.",
    },
    {
      "key": "unsubscribedTopicIds",
      "label": "Unsubscribe from topic IDs",
      "type": "string",
      "hint":
        "Comma-separated email topic ids (see List Email Topics) to unsubscribe the customer from. It only ever unsubscribes; it cannot re-subscribe.",
    },
    {
      "key": "legacyId",
      "label": "Legacy ID",
      "type": "string",
      "hint": "External identifier for this customer in a third-party system.",
    },
    {
      "key": "skipInvite",
      "label": "Skip invite email",
      "type": "boolean",
      "hint": "True to not send the platform invite email.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Record id (the full vendor object is returned)" },
  ],

  async execute(input, ctx) {
    return (await new UscreenClient(ctx).call<Record<string, unknown>>("POST", "/customers", {
      body: compact({
        "email": input.email,
        "legacy_id": input.legacyId,
        "skip_invite": input.skipInvite,
        "name": input.name,
        "password": input.password,
        "payment_user_id": input.paymentUserId,
        "field_1": input.field1,
        "field_2": input.field2,
        "field_3": input.field3,
        "opted_in_for_news_and_updates": input.optedInForNewsAndUpdates,
        "opted_in_for_community_updates": input.optedInForCommunityUpdates,
        "tags": csv(input.tags),
        "unsubscribed_topic_ids": csvInts(input.unsubscribedTopicIds),
      }),
    })) ?? {};
  },
};

export default customerCreate;
