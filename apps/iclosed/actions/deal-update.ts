import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, IClosedClient } from "../lib/client.ts";

/**
 * `PUT /v1/deals` — Update a deal.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  id: number;
  value?: number;
  recurring?: boolean;
  transactionType?: string;
  productId?: number;
  closerId?: number;
  time?: string;
  transactionIds?: unknown;
  type?: string;
  email?: string;
}

const dealUpdate: ActionDefinition<Input> = {
  key: "deal-update",
  type: "perform",
  resource: "deal",
  title: "Update deal",
  description: "Update a deal.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Deal ID",
      type: "number",
      validation: { integer: true },
      required: true,
    },
    {
      key: "value",
      label: "Value",
      type: "number",
    },
    {
      key: "recurring",
      label: "Recurring",
      type: "boolean",
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
      key: "productId",
      label: "Product ID",
      type: "number",
      validation: { integer: true },
    },
    {
      key: "closerId",
      label: "Closer user ID",
      type: "number",
      validation: { integer: true },
    },
    {
      key: "time",
      label: "Deal time",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "transactionIds",
      label: "Transaction IDs",
      type: "json",
      hint: "JSON array of integers.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [{ value: "DEAL", label: "Deal" }, { value: "TRANSACTION", label: "Transaction" }],
    },
    {
      key: "email",
      label: "Email",
      type: "string",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The deal" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/deals", {
      method: "PUT",
      body: compact({
        id: input.id,
        value: input.value,
        recurring: input.recurring,
        transactionType: input.transactionType,
        productId: input.productId,
        closerId: input.closerId,
        time: input.time,
        transactionIds: asOptionalJson(input.transactionIds, "Transaction IDs"),
        type: input.type,
        email: input.email,
      }),
    });
  },
};

export default dealUpdate;
