import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, pick, RaiselyClient } from "../lib/client.ts";
import { customFieldParams, privateParam } from "../lib/params.ts";

interface Input {
  private?: boolean;
  email: string;
  amount: number;
  currency: string;
  type: string;
  method: string;
  campaignUuid?: string;
  profileUuid?: string;
  mode?: string;
  date?: string;
  anonymous?: boolean;
  message?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  preferredName?: string;
  phoneNumber?: string;
  address1?: string;
  address2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  public?: string | Record<string, unknown>;
  private_fields?: string | Record<string, unknown>;
}

/**
 * Raisely documents `email`, `currency`, `type`, `amount` and `method` as the required fields.
 * The payment-gateway fields (`token`, `card`, `customer`, `gatewayVersion`) are deliberately not
 * exposed: this action records a gift (offline or custom), it does not charge a card.
 */
const donationCreate: ActionDefinition<Input> = {
  key: "donation-create",
  type: "perform",
  resource: "donation",
  title: "Create Donation",
  description:
    "Record a donation against a campaign or profile — typically an offline or custom gift. " +
    "Card payments need a gateway token this action does not take.",
  idempotent: false,
  params: [
    { key: "email", label: "Donor email", type: "string", required: true },
    {
      key: "amount",
      label: "Amount (cents)",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      required: true,
      hint: "3 letter currency code, e.g. AUD or USD.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [{ value: "ONLINE", label: "Online" }, { value: "OFFLINE", label: "Offline" }],
    },
    {
      key: "method",
      label: "Method",
      type: "select",
      required: true,
      options: [
        { value: "OFFLINE", label: "Offline" },
        { value: "CUSTOM", label: "Custom" },
        { value: "CREDIT_CARD", label: "Credit card" },
        { value: "PAYPAL", label: "PayPal" },
        { value: "APPLE_PAY", label: "Apple Pay" },
        { value: "STRIPE_INTENT", label: "Stripe intent" },
        { value: "FACEBOOK", label: "Facebook" },
      ],
      hint: "Use OFFLINE or CUSTOM to record a gift; gateway methods need a payment token.",
    },
    { key: "campaignUuid", label: "Campaign uuid", type: "string" },
    { key: "profileUuid", label: "Profile uuid", type: "string" },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: [{ value: "LIVE", label: "Live" }, { value: "TEST", label: "Test" }],
    },
    { key: "date", label: "Date received", type: "datetime", hint: "ISO 8601." },
    { key: "anonymous", label: "Anonymous", type: "boolean" },
    { key: "message", label: "Donor message", type: "text" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "fullName", label: "Full name", type: "string" },
    { key: "preferredName", label: "Preferred name", type: "string" },
    { key: "phoneNumber", label: "Phone number", type: "string" },
    { key: "address1", label: "Address line 1", type: "string" },
    { key: "address2", label: "Address line 2", type: "string" },
    { key: "suburb", label: "Suburb / city", type: "string" },
    { key: "state", label: "State / province", type: "string" },
    { key: "postcode", label: "Postcode", type: "string" },
    { key: "country", label: "Country", type: "string" },
    ...customFieldParams(),
    privateParam(),
  ],
  output: [
    { key: "uuid", type: "string", label: "Donation uuid" },
    { key: "amount", type: "number", label: "Amount (cents)" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const data = compact({
      ...pick(input, [
        "email",
        "amount",
        "currency",
        "type",
        "method",
        "campaignUuid",
        "profileUuid",
        "mode",
        "date",
        "anonymous",
        "message",
        "firstName",
        "lastName",
        "fullName",
        "preferredName",
        "phoneNumber",
        "address1",
        "address2",
        "suburb",
        "state",
        "postcode",
        "country",
      ]),
      ...customFields(input),
    });
    return await new RaiselyClient(ctx).data("/donations", {
      method: "POST",
      query: compact({ private: input.private }),
      body: { data },
    });
  },
};

export default donationCreate;
