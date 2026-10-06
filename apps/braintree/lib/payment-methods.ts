export const PAYMENT_METHOD_OUTPUT = [
  { key: "id", type: "string" as const, label: "Payment method GraphQL ID" },
  { key: "legacyId", type: "string" as const, label: "Legacy ID (the vault token)" },
  { key: "usage", type: "string" as const, label: "SINGLE_USE or MULTI_USE" },
  { key: "createdAt", type: "string" as const, label: "Created at" },
  { key: "customer", type: "object" as const, label: "Owning customer" },
  { key: "details", type: "object" as const, label: "Type-specific details (see __typename)" },
];
