import type { Param } from "@w6w/types";
import { compact, customFields } from "./client.ts";

export const TRANSACTION_OUTPUT = [
  { key: "id", type: "string" as const, label: "Transaction GraphQL ID" },
  {
    key: "legacyId",
    type: "string" as const,
    label: "Legacy ID (as in the Control Panel and SDKs)",
  },
  { key: "status", type: "string" as const, label: "Status (AUTHORIZED, SETTLED, VOIDED, ...)" },
  { key: "amount", type: "object" as const, label: "Amount ({ value, currencyCode })" },
  { key: "orderId", type: "string" as const, label: "Order ID" },
  { key: "createdAt", type: "string" as const, label: "Created at" },
  { key: "merchantAccountId", type: "string" as const, label: "Merchant account ID" },
  { key: "customer", type: "object" as const, label: "Customer" },
  { key: "paymentMethod", type: "object" as const, label: "Payment method" },
];

export const APPLY_REQUEST_KEY_HINT =
  "Braintree de-duplicates on this key for 30 days: a repeat with the same input returns the " +
  "original result instead of charging twice. Defaults to the w6w invocation id.";

export const apiRequestKeyParam: Param = {
  key: "apiRequestKey",
  label: "Idempotency key (apiRequestKey)",
  type: "string",
  hint: APPLY_REQUEST_KEY_HINT,
};

export const amountParam = (label = "Amount", required = true): Param => ({
  key: "amount",
  label,
  type: "string",
  required,
  placeholder: "10.00",
  hint: "A decimal string in the merchant account's currency, digits and one point only " +
    "(`10.00`). Sent as a string: Braintree's `Amount` scalar is not a JSON number.",
});

export const merchantAccountParam: Param = {
  key: "merchantAccountId",
  label: "Merchant account ID",
  type: "string",
  hint: "Selects the merchant account, and with it the currency. Defaults to your default " +
    "merchant account.",
};

export const orderIdParam: Param = { key: "orderId", label: "Order ID", type: "string" };

export const customFieldsParam: Param = {
  key: "customFields",
  label: "Custom fields",
  type: "json",
  hint: 'A JSON object `{"name": "value"}` or `[{"name","value"}]`. Each field must already be ' +
    "defined in the Control Panel.",
};

export interface ChargeInput {
  paymentMethodId: string;
  amount: string;
  merchantAccountId?: string;
  orderId?: string;
  customerId?: string;
  purchaseOrderNumber?: string;
  customFields?: unknown;
  apiRequestKey?: string;
}

/** `TransactionInput` for chargePaymentMethod / authorizePaymentMethod. */
export function transactionInput(input: ChargeInput): Record<string, unknown> {
  return compact({
    amount: String(input.amount),
    merchantAccountId: input.merchantAccountId,
    orderId: input.orderId,
    customerId: input.customerId,
    purchaseOrderNumber: input.purchaseOrderNumber,
    customFields: customFields(input.customFields),
  });
}

export const chargeParams: Param[] = [
  {
    key: "paymentMethodId",
    label: "Payment method ID",
    type: "string",
    required: true,
    hint: "A vaulted payment method's GraphQL ID, or a single-use nonce (`tokencc_...`) from " +
      "the client SDK. A single-use method can be spent once.",
  },
  amountParam(),
  merchantAccountParam,
  orderIdParam,
  {
    key: "customerId",
    label: "Customer ID",
    type: "string",
    hint: "Associate the transaction with this customer (GraphQL ID, not the legacy id).",
  },
  { key: "purchaseOrderNumber", label: "Purchase order number", type: "string" },
  customFieldsParam,
  apiRequestKeyParam,
];
