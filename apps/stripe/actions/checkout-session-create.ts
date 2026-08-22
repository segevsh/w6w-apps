import type { ActionDefinition } from "@w6w/types";
import { metadata, StripeClient, unset } from "../lib/client.ts";
import { metadataParam } from "../lib/params.ts";

interface Input {
  mode?: string;
  priceId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl?: string;
  clientReferenceId?: string;
  customerId?: string;
  customerEmail?: string;
  trialPeriodDays?: number;
  allowPromotionCodes?: boolean;
  metadata?: unknown;
}

/**
 * A Stripe-hosted checkout page. Returns a `url` to redirect the customer to.
 *
 * **This is the only action in this app that can start a subscription for a
 * customer who has no payment method yet.** `subscription-create` requires an
 * existing customer that already has one attached, because card details may
 * never reach this runtime — collecting them is a PCI boundary, so it happens
 * on Stripe's page, not here. A new self-serve signup therefore goes through
 * checkout; `subscription-create` is for a customer you have already set up.
 *
 * **`clientReferenceId` is how the resulting subscription finds its way home.**
 * Stripe echoes it back on the session and on the `checkout.session.completed`
 * webhook, and it is the only field that ties a payment to a record in YOUR
 * system. Without it you get a Stripe Customer with no link to the account that
 * paid, and reconciling after the fact means matching on email, which is not a
 * key. Set it to whatever your side calls the payer.
 *
 * `successUrl` should carry Stripe's literal `{CHECKOUT_SESSION_ID}` template
 * so the landing page can retrieve the session it came from. It is passed
 * through verbatim — the braces are Stripe's substitution syntax, not ours.
 */
const checkoutSessionCreate: ActionDefinition<Input> = {
  key: "checkout-session-create",
  type: "perform",
  resource: "checkout-session",
  title: "Create Checkout Session",
  description:
    "A Stripe-hosted payment page. Returns a URL to redirect to — the only way to start a " +
    "subscription for a customer with no saved card.",
  idempotent: true,
  params: [
    {
      key: "mode",
      label: "Mode",
      type: "select",
      default: "subscription",
      options: [
        { value: "subscription", label: "Subscription (recurring price)" },
        { value: "payment", label: "One-off payment" },
      ],
      hint: "Subscription mode requires a recurring price.",
    },
    {
      key: "priceId",
      label: "Price ID",
      type: "string",
      required: true,
      placeholder: "price_…",
      hint: "The PRICE, not the product — a product id cannot be checked out. See List Prices.",
    },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      default: 1,
      validation: { min: 1, integer: true },
    },
    {
      key: "successUrl",
      label: "Success URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/done?session_id={CHECKOUT_SESSION_ID}",
      hint: "Include the literal {CHECKOUT_SESSION_ID} to read the session back on landing.",
    },
    {
      key: "cancelUrl",
      label: "Cancel URL",
      type: "string",
      placeholder: "https://example.com/pricing",
      hint: "Where Stripe returns a customer who backs out.",
    },
    {
      key: "clientReferenceId",
      label: "Client reference ID",
      type: "string",
      hint: "Your own id for the payer. Echoed on the session and the webhook — the only thing " +
        "linking this payment to your records.",
    },
    {
      key: "customerId",
      label: "Existing customer ID",
      type: "string",
      placeholder: "cus_…",
      advanced: true,
      hint: "Reuses a saved customer. Mutually exclusive with Customer email.",
    },
    {
      key: "customerEmail",
      label: "Customer email",
      type: "string",
      advanced: true,
      hint: "Prefills the form for a NEW customer. Mutually exclusive with Existing customer ID.",
    },
    {
      key: "trialPeriodDays",
      label: "Trial days",
      type: "number",
      advanced: true,
      showIf: { "==": [{ var: "mode" }, "subscription"] },
      validation: { min: 1, integer: true },
      hint: "Free trial before the first charge.",
    },
    {
      key: "allowPromotionCodes",
      label: "Allow promotion codes",
      type: "boolean",
      advanced: true,
      hint: "Shows a promo-code box on the hosted page.",
    },
    metadataParam,
  ],
  output: [
    { key: "id", type: "string", label: "Session ID" },
    { key: "url", type: "string", label: "Hosted page URL — redirect the customer here" },
    { key: "status", type: "string", label: "Status (open / complete / expired)" },
    { key: "mode", type: "string", label: "Mode" },
    { key: "customer", type: "string", label: "Customer ID, once known" },
    { key: "subscription", type: "string", label: "Subscription ID, once complete" },
  ],

  execute(input, ctx) {
    const customerId = unset(input.customerId);
    const customerEmail = unset(input.customerEmail);
    // Stripe rejects both together with a generic 400. Failing here names the
    // two fields, which the vendor's message does not.
    if (customerId && customerEmail) {
      throw new Error(
        "`customerId` and `customerEmail` are mutually exclusive — an existing customer " +
          "already has an email. Set one or neither.",
      );
    }

    const mode = unset(input.mode) ?? "subscription";
    const trial = input.trialPeriodDays;

    return new StripeClient(ctx).request("/checkout/sessions", {
      form: {
        mode,
        line_items: [{ price: input.priceId, quantity: input.quantity }],
        success_url: input.successUrl,
        cancel_url: unset(input.cancelUrl),
        client_reference_id: unset(input.clientReferenceId),
        customer: customerId,
        customer_email: customerEmail,
        // A trial is a property of the subscription being created, so it nests
        // under subscription_data and is meaningless in payment mode.
        subscription_data: mode === "subscription" && trial
          ? { trial_period_days: trial }
          : undefined,
        allow_promotion_codes: input.allowPromotionCodes,
        metadata: metadata(input.metadata),
      },
    });
  },
};

export default checkoutSessionCreate;
