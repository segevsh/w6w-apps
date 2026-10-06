export const CUSTOMER_OUTPUT = [
  { key: "id", type: "string" as const, label: "Customer ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "email", type: "string" as const, label: "Email" },
  { key: "externalId", type: "string" as const, label: "External ID" },
  { key: "stripeCustomerId", type: "string" as const, label: "Stripe customer ID" },
  { key: "country", type: "string" as const, label: "Country" },
  { key: "sales", type: "number" as const, label: "Number of sales" },
  { key: "saleAmount", type: "number" as const, label: "Total sale amount (cents)" },
  { key: "createdAt", type: "string" as const, label: "Created at" },
  { key: "firstSaleAt", type: "string" as const, label: "First sale at" },
  { key: "subscriptionCanceledAt", type: "string" as const, label: "Subscription canceled at" },
];
