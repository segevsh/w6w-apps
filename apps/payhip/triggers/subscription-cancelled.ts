import { normalizeSubscription, SUBSCRIPTION_OUTPUT, webhookTrigger } from "../lib/triggers.ts";

/** A customer's subscription is cancelled (Payhip event `subscription.deleted`). */
const subscriptionCancelled = webhookTrigger({
  key: "subscription-cancelled",
  title: "Subscription Cancelled",
  description:
    "Fires when a Payhip subscription is cancelled. The run gets the subscription and customer ids, plan, product, status and when it started and ended.",
  type: "subscription.deleted",
  output: SUBSCRIPTION_OUTPUT,
  normalize: normalizeSubscription,
  sample: {
    type: "subscription.deleted",
    subscriptionId: "sample-subscription-id",
    customerId: "sample-customer-id",
    status: "canceled",
    customerEmail: "buyer@example.com",
    customerFirstName: "Sample",
    customerLastName: "Buyer",
    planName: "Silver Plan",
    productName: "My Course",
    productLink: "nb7fD",
    dateSubscriptionStarted: 1762768800,
    dateSubscriptionDeleted: 1762769000,
  },
});

export default subscriptionCancelled;
