import type { ActionDefinition, OutputField, Param } from "@w6w/types";
import { AuthorizeNetClient } from "./client.ts";
import { asObject } from "./ordered-json.ts";

interface RequestSpec {
  key: string;
  title: string;
  description: string;
  resource: string;
  type: "read" | "search" | "perform";
  request: string;
  params: Param[];
  output: OutputField[];
}

export const refIdParam: Param = {
  key: "refId",
  label: "Reference ID",
  type: "string",
  advanced: true,
  hint: "Optional correlation ID, up to 20 characters. This does not prevent duplicate payments.",
  validation: { maxLength: 20 },
};

export function requestAction(spec: RequestSpec): ActionDefinition {
  const params = [...spec.params, refIdParam];
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    resource: spec.resource,
    type: spec.type,
    idempotent: spec.type !== "perform",
    params,
    output: spec.output,
    execute(input, ctx) {
      const body: Record<string, unknown> = {};
      const allowed = new Set(params.map((param) => param.key));
      for (const key of Object.keys(input)) {
        if (!allowed.has(key)) throw new Error(`Authorize.Net: unsupported parameter ${key}`);
      }
      for (const param of params) {
        const value = input[param.key];
        if (value === undefined || value === "") {
          if (param.required) throw new Error(`Authorize.Net: ${param.label} is required`);
          continue;
        }
        body[param.key] = param.type === "json" ? asObject(value, param.key) : value;
      }
      if (spec.request === "getTransactionDetailsRequest" && !body.transId && !body.transrefId) {
        throw new Error("Authorize.Net: transaction ID or transaction reference ID is required");
      }
      if (
        spec.request === "getCustomerProfileRequest" &&
        !body.customerProfileId && !body.merchantCustomerId && !body.email
      ) {
        throw new Error(
          "Authorize.Net: customer profile ID, merchant customer ID or email is required",
        );
      }
      return new AuthorizeNetClient(ctx).request(spec.request, body);
    },
  };
}

export const TRANSACTION_OUTPUT: OutputField[] = [
  { key: "refId", type: "string", label: "Reference ID" },
  { key: "messages", type: "object", label: "API messages" },
  { key: "transactionResponse", type: "object", label: "Transaction response" },
  { key: "transactionResponse.transId", type: "string", label: "Transaction ID" },
  {
    key: "transactionResponse.responseCode",
    type: "string",
    label: "Response code (1 approved, 4 held for review)",
  },
];

export function paymentAction(spec: {
  key: string;
  title: string;
  description: string;
  transactionType:
    | "authCaptureTransaction"
    | "authOnlyTransaction"
    | "priorAuthCaptureTransaction"
    | "refundTransaction"
    | "voidTransaction";
}): ActionDefinition {
  const initial = ["authCaptureTransaction", "authOnlyTransaction"].includes(spec.transactionType);
  const refund = spec.transactionType === "refundTransaction";
  const capture = spec.transactionType === "priorAuthCaptureTransaction";
  const params: Param[] = [
    ...(!initial
      ? [{
        key: "refTransId",
        label: "Original transaction ID",
        type: "string" as const,
        required: true,
      }]
      : []),
    ...(spec.transactionType !== "voidTransaction"
      ? [{
        key: "amount",
        label: "Amount",
        type: "string" as const,
        required: !capture,
        hint: capture
          ? "Omit to capture the full authorized amount; otherwise use a decimal string."
          : "Decimal amount, such as 10.50. Use a string to preserve precision.",
      }]
      : []),
    ...(initial || refund
      ? [{
        key: "payment",
        label: "Payment",
        type: "json" as const,
        secret: true,
        hint: refund
          ? 'For card refunds: {"creditCard":{"cardNumber":"last four digits","expirationDate":"XXXX"}}. The original transaction must be settled.'
          : 'Payment object, e.g. {"opaqueData":{"dataDescriptor":"COMMON.ACCEPT.INAPP.PAYMENT","dataValue":"token"}}. Use payment or a saved profile.',
      }]
      : []),
    ...(initial
      ? [{
        key: "profile",
        label: "Saved customer profile",
        type: "json" as const,
        hint:
          '{"customerProfileId":"123","paymentProfile":{"paymentProfileId":"456"}}. Use this instead of payment.',
      }]
      : []),
    {
      key: "additionalFields",
      label: "Additional transaction fields",
      type: "json",
      advanced: true,
      hint:
        "Optional order, billTo, shipTo, lineItems, transactionSettings and other documented transaction fields. Keys are ordered automatically.",
    },
    refIdParam,
  ];
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    resource: "transaction",
    type: "perform",
    idempotent: false,
    params,
    output: TRANSACTION_OUTPUT,
    execute(input, ctx) {
      const allowed = new Set(params.map((param) => param.key));
      for (const key of Object.keys(input)) {
        if (!allowed.has(key)) throw new Error(`Authorize.Net: unsupported parameter ${key}`);
      }
      for (const param of params) {
        if (param.required && (input[param.key] === undefined || input[param.key] === "")) {
          throw new Error(`Authorize.Net: ${param.label} is required`);
        }
      }
      const additional = input.additionalFields === undefined || input.additionalFields === ""
        ? {}
        : asObject(input.additionalFields, "additionalFields");
      for (const key of ["transactionType", "amount", "payment", "profile", "refTransId"]) {
        if (Object.hasOwn(additional, key)) {
          throw new Error(`Authorize.Net: ${key} cannot be overridden in additionalFields`);
        }
      }
      const transaction: Record<string, unknown> = {
        ...additional,
        transactionType: spec.transactionType,
      };
      for (const key of ["amount", "refTransId", "payment", "profile"]) {
        const value = input[key];
        if (value !== undefined && value !== "") {
          transaction[key] = key === "payment" || key === "profile" ? asObject(value, key) : value;
        }
      }
      if (initial && Boolean(transaction.payment) === Boolean(transaction.profile)) {
        throw new Error("Authorize.Net: provide exactly one of payment or saved profile");
      }
      if (refund && !transaction.payment) {
        throw new Error("Authorize.Net: payment details are required for a refund");
      }
      if (
        transaction.amount !== undefined &&
        !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(String(transaction.amount))
      ) {
        throw new Error("Authorize.Net: amount must be a non-negative decimal");
      }
      return new AuthorizeNetClient(ctx).request("createTransactionRequest", {
        refId: input.refId === "" ? undefined : input.refId,
        transactionRequest: transaction,
      });
    },
  };
}
