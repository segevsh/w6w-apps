import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, IClosedClient } from "../lib/client.ts";

/**
 * `POST /v1/deals` — Create a deal against a call.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  eventCallId: number;
  productId?: number;
  productName?: string;
  value?: number;
  time?: string;
  transactionType?: string;
  transactionIds?: unknown;
}

const dealCreate: ActionDefinition<Input> = {
  key: "deal-create",
  type: "perform",
  resource: "deal",
  title: "Create deal",
  description: "Create a deal against a call.",
  idempotent: false,
  params: [
    {
      key: "eventCallId",
      label: "Call ID",
      type: "number",
      validation: { integer: true },
      required: true,
    },
    {
      key: "productId",
      label: "Product ID",
      type: "number",
      validation: { integer: true },
    },
    {
      key: "productName",
      label: "Product name",
      type: "string",
    },
    {
      key: "value",
      label: "Value",
      type: "number",
    },
    {
      key: "time",
      label: "Deal time",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "transactionType",
      label: "Transaction type",
      type: "select",
      options: [{ value: "WON", label: "Won" }, { value: "RECURRING", label: "Recurring" }, {
        value: "DEPOSIT",
        label: "Deposit",
      }],
    },
    {
      key: "transactionIds",
      label: "Transaction IDs",
      type: "json",
      hint: "JSON array of integers to sync.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The deal" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/deals", {
      method: "POST",
      body: compact({
        eventCallId: input.eventCallId,
        productId: input.productId,
        productName: input.productName,
        value: input.value,
        time: input.time,
        transactionType: input.transactionType,
        transactionIds: asOptionalJson(input.transactionIds, "Transaction IDs"),
      }),
    });
  },
};

export default dealCreate;
