import { normalizeSubscription, SUBSCRIPTION_OUTPUT, webhookTrigger } from "../lib/triggers.ts";

/** A customer starts a subscription (Payhip event `subscription.created`). */
const newSubscription = webhookTrigger({
  key: "new-subscription",
  title: "New Subscription",
  description:
    "Fires when a customer starts a Payhip subscription. The run gets the subscription and customer ids, plan, product and the customer's name and email.",
  type: "subscription.created",
  output: SUBSCRIPTION_OUTPUT,
  normalize: normalizeSubscription,
  sample: {
    type: "subscription.created",
    subscriptionId: "sample-subscription-id",
    customerId: "sample-customer-id",
    status: "active",
    customerEmail: "buyer@example.com",
    customerFirstName: "Sample",
    customerLastName: "Buyer",
    planName: "Silver Plan",
    productName: "My Course",
    productLink: "nb7fD",
    dateSubscriptionStarted: 1762768800,
    dateSubscriptionDeleted: null,
  },
});

export default newSubscription;
